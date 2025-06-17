#!/bin/bash

# CareConnect Firebase 복원 스크립트
# 사용법: ./restore.sh <backup_file.tar.gz> [target_environment]

set -e

# 파라미터 확인
if [ $# -lt 1 ]; then
    echo "사용법: ./restore.sh <backup_file.tar.gz> [target_environment]"
    echo "예시: ./restore.sh ./backups/prod_backup_20241212_143022.tar.gz dev"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_ENV="${2:-dev}"
RESTORE_DIR="./restore_temp"
DATE=$(date +"%Y%m%d_%H%M%S")

# 색상 출력 함수
print_info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# 백업 파일 존재 확인
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "백업 파일을 찾을 수 없습니다: $BACKUP_FILE"
    exit 1
fi

print_info "🔄 CareConnect 복원 시작..."
print_info "백업 파일: $BACKUP_FILE"
print_info "대상 환경: $TARGET_ENV"

# Firebase 프로젝트 설정
if [ "$TARGET_ENV" = "prod" ]; then
    PROJECT_ID="careconnect-444da"
    print_warning "⚠️ 프로덕션 환경으로 복원합니다!"
    read -p "계속하시겠습니까? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "복원이 취소되었습니다."
        exit 0
    fi
else
    PROJECT_ID="careconnect-444da"  # 개발용도 같은 프로젝트
fi

# Firebase CLI 확인
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI가 설치되지 않았습니다."
    exit 1
fi

# Firebase 로그인 확인
if ! firebase projects:list &> /dev/null; then
    print_warning "Firebase에 로그인이 필요합니다."
    firebase login
fi

# 프로젝트 선택
firebase use "$PROJECT_ID"

# 임시 복원 디렉토리 생성
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"

# 1. 백업 파일 압축 해제
print_info "📦 백업 파일 압축 해제 중..."
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
print_success "압축 해제 완료"

# 2. 백업 메타데이터 읽기
METADATA_FILE=$(find "$RESTORE_DIR" -name "backup_metadata_*.json" | head -1)
if [ -f "$METADATA_FILE" ]; then
    print_info "📋 백업 메타데이터 확인 중..."
    BACKUP_ENV=$(cat "$METADATA_FILE" | grep -o '"environment": "[^"]*"' | cut -d'"' -f4)
    BACKUP_DATE=$(cat "$METADATA_FILE" | grep -o '"timestamp": "[^"]*"' | cut -d'"' -f4)
    print_info "백업 환경: $BACKUP_ENV"
    print_info "백업 일시: $BACKUP_DATE"
else
    print_warning "백업 메타데이터를 찾을 수 없습니다."
fi

# 3. 현재 데이터 백업 (안전 조치)
print_info "💾 현재 데이터 안전 백업 중..."
SAFETY_BACKUP_FILE="./backups/safety_backup_before_restore_${DATE}.json"
mkdir -p ./backups
if firebase firestore:export "$SAFETY_BACKUP_FILE"; then
    print_success "안전 백업 완료: $SAFETY_BACKUP_FILE"
else
    print_error "안전 백업 실패"
    read -p "백업 없이 계속하시겠습니까? (y/N): " continue_anyway
    if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
        exit 1
    fi
fi

# 4. Firestore 데이터 복원
print_info "🗃️ Firestore 데이터 복원 중..."
FIRESTORE_BACKUP=$(find "$RESTORE_DIR" -name "*firestore*.json" | head -1)

if [ -f "$FIRESTORE_BACKUP" ]; then
    # 기존 데이터 삭제 여부 확인
    print_warning "⚠️ 기존 Firestore 데이터가 모두 삭제됩니다!"
    read -p "계속하시겠습니까? (y/N): " confirm_delete
    if [ "$confirm_delete" = "y" ] || [ "$confirm_delete" = "Y" ]; then
        if firebase firestore:delete --all-collections --yes; then
            print_success "기존 데이터 삭제 완료"
        else
            print_error "기존 데이터 삭제 실패"
            exit 1
        fi
        
        # 데이터 복원
        if firebase firestore:import "$FIRESTORE_BACKUP"; then
            print_success "Firestore 데이터 복원 완료"
        else
            print_error "Firestore 데이터 복원 실패"
            exit 1
        fi
    else
        print_info "Firestore 복원이 취소되었습니다."
    fi
else
    print_warning "Firestore 백업 파일을 찾을 수 없습니다."
fi

# 5. 보안 규칙 복원
print_info "🔒 보안 규칙 복원 중..."
RULES_DIR=$(find "$RESTORE_DIR" -name "rules_*" -type d | head -1)

if [ -d "$RULES_DIR" ]; then
    # Firestore 규칙 복원
    if [ -f "$RULES_DIR/firestore.rules" ]; then
        cp "$RULES_DIR/firestore.rules" ./firestore.rules
        firebase deploy --only firestore:rules
        print_success "Firestore 보안 규칙 복원 완료"
    fi
    
    # Storage 규칙 복원
    if [ -f "$RULES_DIR/storage.rules" ]; then
        cp "$RULES_DIR/storage.rules" ./storage.rules
        firebase deploy --only storage
        print_success "Storage 보안 규칙 복원 완료"
    fi
else
    print_warning "보안 규칙 백업을 찾을 수 없습니다."
fi

# 6. Firebase 설정 복원
print_info "⚙️ Firebase 설정 복원 중..."
CONFIG_DIR=$(find "$RESTORE_DIR" -name "config_*" -type d | head -1)

if [ -d "$CONFIG_DIR" ]; then
    # firebase.json 복원
    if [ -f "$CONFIG_DIR/firebase.json" ]; then
        cp "$CONFIG_DIR/firebase.json" ./firebase.json
        print_success "firebase.json 복원 완료"
    fi
    
    # .firebaserc 복원
    if [ -f "$CONFIG_DIR/.firebaserc" ]; then
        cp "$CONFIG_DIR/.firebaserc" ./.firebaserc
        print_success ".firebaserc 복원 완료"
    fi
    
    # firestore.indexes.json 복원
    if [ -f "$CONFIG_DIR/firestore.indexes.json" ]; then
        cp "$CONFIG_DIR/firestore.indexes.json" ./firestore.indexes.json
        firebase deploy --only firestore:indexes
        print_success "Firestore 인덱스 복원 완료"
    fi
else
    print_warning "Firebase 설정 백업을 찾을 수 없습니다."
fi

# 7. 복원 검증
print_info "✅ 복원 검증 중..."

# Firestore 연결 테스트
if firebase firestore:indexes 2>/dev/null | grep -q "indexes"; then
    print_success "Firestore 연결 확인"
else
    print_warning "Firestore 연결 확인 실패"
fi

# 보안 규칙 검증
if [ -f "firestore.rules" ]; then
    print_success "Firestore 보안 규칙 확인"
else
    print_warning "Firestore 보안 규칙 파일이 없습니다"
fi

# 8. 임시 파일 정리
print_info "🧹 임시 파일 정리 중..."
rm -rf "$RESTORE_DIR"
print_success "정리 완료"

# 9. 복원 후 권장사항
print_info "📝 복원 후 확인사항:"
echo "  1. 웹 애플리케이션 동작 확인"
echo "  2. 사용자 인증 테스트"
echo "  3. 데이터 읽기/쓰기 테스트"
echo "  4. 보안 규칙 동작 확인"
echo "  5. 환경변수 설정 확인"
echo
print_success "🎉 복원 완료!"
echo "복원된 환경: $TARGET_ENV"
echo "복원 시간: $(date)"

# 안전 백업 파일 위치 안내
if [ -f "$SAFETY_BACKUP_FILE" ]; then
    echo
    print_info "💾 이전 데이터 안전 백업 위치:"
    echo "  $SAFETY_BACKUP_FILE"
    echo "  (문제 발생시 이 파일로 되돌릴 수 있습니다)"
fi