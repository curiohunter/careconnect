import { DailyMealPlan, DailyMealPlanNew, DateRangeMealPlan, DayOfWeek } from '../types';
import { DataService } from '../services/dataService';

// 주간 시작 날짜로부터 7일간의 날짜 배열 생성
export const generateWeekDates = (weekStartDate: string): string[] => {
  const dates = [];
  const startDate = new Date(weekStartDate);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(DataService.formatDate(date));
  }
  
  return dates;
};

// 요일 기반 식사 계획을 날짜 기반으로 변환
export const convertWeeklyToDateBased = (
  weeklyPlan: DailyMealPlan, 
  weekStartDate: string
): DateRangeMealPlan => {
  const dates = generateWeekDates(weekStartDate);
  const dayOfWeekKeys = Object.keys(DayOfWeek) as DayOfWeek[];
  const datePlan: DateRangeMealPlan = {};
  
  dayOfWeekKeys.forEach((dayOfWeek, index) => {
    const dayMeal = weeklyPlan[dayOfWeek];
    if (dayMeal && dayMeal.menu) {
      const date = dates[index];
      datePlan[date] = {
        date,
        menu: dayMeal.menu,
        notes: dayMeal.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  });
  
  return datePlan;
};

// 마이그레이션 검증
export const validateMigration = (
  originalData: DailyMealPlan,
  migratedData: DateRangeMealPlan,
  weekStartDate: string
): {
  isValid: boolean;
  errors: string[];
  summary: {
    originalEntries: number;
    migratedEntries: number;
    successfulMigrations: number;
  };
} => {
  const errors: string[] = [];
  const dates = generateWeekDates(weekStartDate);
  const dayOfWeekKeys = Object.keys(DayOfWeek) as DayOfWeek[];
  
  let originalEntries = 0;
  let successfulMigrations = 0;
  
  // 원본 데이터 검증
  dayOfWeekKeys.forEach((dayOfWeek, index) => {
    const originalEntry = originalData[dayOfWeek];
    if (originalEntry && originalEntry.menu) {
      originalEntries++;
      
      const correspondingDate = dates[index];
      const migratedEntry = migratedData[correspondingDate];
      
      if (!migratedEntry) {
        errors.push(`${dayOfWeek} (${correspondingDate}) 데이터가 마이그레이션되지 않았습니다.`);
      } else if (migratedEntry.menu !== originalEntry.menu) {
        errors.push(`${dayOfWeek} (${correspondingDate}) 메뉴가 일치하지 않습니다. 원본: "${originalEntry.menu}", 마이그레이션: "${migratedEntry.menu}"`);
      } else if (migratedEntry.notes !== originalEntry.notes) {
        errors.push(`${dayOfWeek} (${correspondingDate}) 특이사항이 일치하지 않습니다.`);
      } else {
        successfulMigrations++;
      }
    }
  });
  
  // 추가 데이터 검증 (마이그레이션된 데이터에만 있는 항목)
  Object.keys(migratedData).forEach(date => {
    const dateIndex = dates.indexOf(date);
    if (dateIndex === -1) {
      errors.push(`예상하지 못한 날짜 데이터가 발견되었습니다: ${date}`);
    }
  });
  
  return {
    isValid: errors.length === 0 && originalEntries === successfulMigrations,
    errors,
    summary: {
      originalEntries,
      migratedEntries: Object.keys(migratedData).length,
      successfulMigrations
    }
  };
};

// 마이그레이션 실행
export const executeMigration = async (
  connectionId: string,
  weeklyPlan: DailyMealPlan,
  weekStartDate: string
): Promise<{
  success: boolean;
  migratedData?: DateRangeMealPlan;
  validation?: ReturnType<typeof validateMigration>;
  error?: string;
}> => {
  try {
    // 1. 변환 실행
    const migratedData = convertWeeklyToDateBased(weeklyPlan, weekStartDate);
    
    // 2. 검증
    const validation = validateMigration(weeklyPlan, migratedData, weekStartDate);
    
    if (!validation.isValid) {
      return {
        success: false,
        validation,
        error: '마이그레이션 검증에 실패했습니다: ' + validation.errors.join(', ')
      };
    }
    
    // 3. 데이터베이스에 저장
    const savePromises = Object.entries(migratedData).map(([date, mealPlan]) => 
      DataService.saveDateBasedMealPlan(connectionId, date, mealPlan)
    );
    
    await Promise.all(savePromises);
    
    return {
      success: true,
      migratedData,
      validation
    };
    
  } catch (error) {
    console.error('마이그레이션 실행 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    };
  }
};

// 마이그레이션 롤백
export const rollbackMigration = async (
  connectionId: string,
  dateRange: { startDate: string; endDate: string }
): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> => {
  try {
    // 백업 데이터 확인 (실제 구현에서는 백업 시스템 필요)
    console.warn('⚠️ 롤백 기능은 현재 제한적으로 구현되어 있습니다.');
    
    // 날짜 범위의 모든 날짜별 식사 계획 삭제
    const dates = generateWeekDates(dateRange.startDate);
    let deletedCount = 0;
    
    for (const date of dates) {
      try {
        // 삭제 전 데이터 존재 확인
        const existingData = await DataService.getDateBasedMealPlan(connectionId, date);
        if (existingData) {
          // 실제 삭제 로직 (현재는 빈 데이터로 덮어쓰기)
          await DataService.saveDateBasedMealPlan(connectionId, date, {
            date,
            menu: '',
            notes: '',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          deletedCount++;
        }
      } catch (error) {
        console.warn(`날짜 ${date} 롤백 중 오류:`, error);
      }
    }
    
    return {
      success: true,
      deletedCount
    };
    
  } catch (error) {
    console.error('롤백 실행 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '롤백 중 알 수 없는 오류가 발생했습니다.'
    };
  }
};

// 시스템 테스트 시나리오
export const runSystemTests = async (
  connectionId: string
): Promise<{
  success: boolean;
  results: {
    testName: string;
    passed: boolean;
    message: string;
    duration: number;
  }[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
  };
}> => {
  const results: any[] = [];
  const startTime = Date.now();
  
  // 테스트 1: 기본 CRUD 작업
  const test1Start = Date.now();
  try {
    const testDate = '2025-06-16';
    const testMealPlan: DailyMealPlanNew = {
      date: testDate,
      menu: '테스트 메뉴',
      notes: '테스트 특이사항',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 저장
    await DataService.saveDateBasedMealPlan(connectionId, testDate, testMealPlan);
    
    // 조회
    const retrieved = await DataService.getDateBasedMealPlan(connectionId, testDate);
    
    if (retrieved && retrieved.menu === testMealPlan.menu) {
      results.push({
        testName: '기본 CRUD 작업',
        passed: true,
        message: '식사 계획 저장 및 조회 성공',
        duration: Date.now() - test1Start
      });
    } else {
      results.push({
        testName: '기본 CRUD 작업',
        passed: false,
        message: '저장된 데이터와 조회된 데이터가 일치하지 않음',
        duration: Date.now() - test1Start
      });
    }
  } catch (error) {
    results.push({
      testName: '기본 CRUD 작업',
      passed: false,
      message: `CRUD 테스트 실패: ${error}`,
      duration: Date.now() - test1Start
    });
  }
  
  // 테스트 2: 마이그레이션 프로세스
  const test2Start = Date.now();
  try {
    const weeklyPlan: DailyMealPlan = {
      [DayOfWeek.MONDAY]: { menu: '월요일 메뉴', notes: '월요일 특이사항' },
      [DayOfWeek.TUESDAY]: { menu: '화요일 메뉴', notes: '' },
      [DayOfWeek.WEDNESDAY]: { menu: '수요일 메뉴', notes: '수요일 특이사항' },
      [DayOfWeek.THURSDAY]: { menu: '', notes: '' },
      [DayOfWeek.FRIDAY]: { menu: '금요일 메뉴', notes: '' },
      [DayOfWeek.SATURDAY]: { menu: '', notes: '' },
      [DayOfWeek.SUNDAY]: { menu: '', notes: '' }
    };
    
    const migration = await executeMigration(connectionId, weeklyPlan, '2025-06-16');
    
    if (migration.success && migration.validation?.isValid) {
      results.push({
        testName: '마이그레이션 프로세스',
        passed: true,
        message: `마이그레이션 성공: ${migration.validation.summary.successfulMigrations}개 항목 변환`,
        duration: Date.now() - test2Start
      });
    } else {
      results.push({
        testName: '마이그레이션 프로세스',
        passed: false,
        message: migration.error || '마이그레이션 검증 실패',
        duration: Date.now() - test2Start
      });
    }
  } catch (error) {
    results.push({
      testName: '마이그레이션 프로세스',
      passed: false,
      message: `마이그레이션 테스트 실패: ${error}`,
      duration: Date.now() - test2Start
    });
  }
  
  // 테스트 3: 날짜 범위 조회
  const test3Start = Date.now();
  try {
    const dateRange = {
      startDate: '2025-06-16',
      endDate: '2025-06-22'
    };
    
    const rangePlans = await DataService.getDateRangeMealPlans(connectionId, dateRange);
    
    results.push({
      testName: '날짜 범위 조회',
      passed: true,
      message: `날짜 범위 조회 성공: ${Object.keys(rangePlans).length}개 항목 반환`,
      duration: Date.now() - test3Start
    });
  } catch (error) {
    results.push({
      testName: '날짜 범위 조회',
      passed: false,
      message: `날짜 범위 조회 실패: ${error}`,
      duration: Date.now() - test3Start
    });
  }
  
  const totalDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  
  return {
    success: passedTests === results.length,
    results,
    summary: {
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration
    }
  };
};