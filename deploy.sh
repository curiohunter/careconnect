#!/bin/bash

# CareConnect 프로덕션 배포 스크립트
# 사용법: ./deploy.sh [환경]

set -e

ENVIRONMENT="${1:-prod}"
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

print_step() {
    echo -e "\033[35m[STEP]\033[0m $1"
}

# 프로덕션 배포 전 체크리스트
check_prerequisites() {
    print_step "📋 배포 전 체크리스트 확인..."
    
    local failed=0
    
    # 1. Firebase CLI 설치 확인
    if ! command -v firebase &> /dev/null; then
        print_error "❌ Firebase CLI가 설치되지 않았습니다"
        failed=1
    else
        print_info "✅ Firebase CLI 설치됨"
    fi
    
    # 2. Node.js 버전 확인
    if ! command -v node &> /dev/null; then
        print_error "❌ Node.js가 설치되지 않았습니다"
        failed=1
    else
        NODE_VERSION=$(node --version)
        print_info "✅ Node.js 버전: $NODE_VERSION"
    fi
    
    # 3. 환경변수 파일 확인
    if [ "$ENVIRONMENT" = "prod" ]; then
        if [ ! -f ".env.production" ]; then
            print_error "❌ .env.production 파일이 없습니다"
            failed=1
        else
            print_info "✅ .env.production 파일 존재"
        fi
    fi
    
    # 4. Firebase 프로젝트 설정 확인
    if [ ! -f ".firebaserc" ]; then
        print_error "❌ .firebaserc 파일이 없습니다"
        failed=1
    else
        print_info "✅ Firebase 프로젝트 설정 존재"
    fi
    
    # 5. 보안 규칙 파일 확인
    if [ ! -f "firestore.rules" ]; then
        print_error "❌ firestore.rules 파일이 없습니다"
        failed=1
    else
        print_info "✅ Firestore 보안 규칙 존재"
    fi
    
    # 6. package.json 확인
    if [ ! -f "package.json" ]; then
        print_error "❌ package.json 파일이 없습니다"
        failed=1
    else
        print_info "✅ package.json 파일 존재"
    fi
    
    if [ $failed -eq 1 ]; then
        print_error "❌ 배포 전 체크리스트에서 실패한 항목이 있습니다"
        exit 1
    fi
    
    print_success "✅ 모든 전제조건이 충족되었습니다"
}

# 프로덕션 배포 확인
confirm_production_deploy() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo
        print_warning "⚠️  프로덕션 환경으로 배포합니다!"
        print_warning "⚠️  이는 실제 사용자에게 영향을 줄 수 있습니다!"
        echo
        read -p "프로덕션 배포를 계속하시겠습니까? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "배포가 취소되었습니다"
            exit 0
        fi
    fi
}

# 빌드 전 테스트
run_tests() {
    print_step "🧪 테스트 실행 중..."
    
    # TypeScript 타입 체크
    if command -v tsc &> /dev/null; then
        print_info "TypeScript 타입 검사 중..."
        if tsc --noEmit; then
            print_success "✅ TypeScript 타입 검사 통과"
        else
            print_error "❌ TypeScript 타입 검사 실패"
            exit 1
        fi
    fi
    
    # ESLint 검사 (있는 경우)
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
        if command -v eslint &> /dev/null; then
            print_info "ESLint 검사 중..."
            if npm run lint 2>/dev/null || npx eslint . --ext .ts,.tsx; then
                print_success "✅ ESLint 검사 통과"
            else
                print_warning "⚠️ ESLint 검사에서 경고가 있습니다"
            fi
        fi
    fi
}

# 의존성 설치 및 빌드
build_project() {
    print_step "📦 프로젝트 빌드 중..."
    
    # 의존성 설치
    print_info "의존성 설치 중..."
    if npm ci; then
        print_success "✅ 의존성 설치 완료"
    else
        print_error "❌ 의존성 설치 실패"
        exit 1
    fi
    
    # 프로덕션 빌드
    print_info "프로덕션 빌드 중..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        export NODE_ENV=production
    fi
    
    if npm run build; then
        print_success "✅ 빌드 완료"
    else
        print_error "❌ 빌드 실패"
        exit 1
    fi
    
    # 빌드 결과 확인
    if [ -d "dist" ]; then
        BUILD_SIZE=$(du -sh dist | cut -f1)
        print_info "빌드 크기: $BUILD_SIZE"
    fi
}

# Firebase 배포
deploy_to_firebase() {
    print_step "🚀 Firebase 배포 중..."
    
    # Firebase 로그인 확인
    if ! firebase projects:list &> /dev/null; then
        print_warning "Firebase 로그인이 필요합니다"
        firebase login
    fi
    
    # 프로젝트 선택
    firebase use careconnect-444da
    
    # 보안 규칙 먼저 배포
    print_info "보안 규칙 배포 중..."
    if firebase deploy --only firestore:rules,storage; then
        print_success "✅ 보안 규칙 배포 완료"
    else
        print_error "❌ 보안 규칙 배포 실패"
        exit 1
    fi
    
    # Firestore 인덱스 배포
    print_info "Firestore 인덱스 배포 중..."
    if firebase deploy --only firestore:indexes; then
        print_success "✅ Firestore 인덱스 배포 완료"
    else
        print_warning "⚠️ Firestore 인덱스 배포 실패 (계속 진행)"
    fi
    
    # 웹 애플리케이션 배포
    print_info "웹 애플리케이션 배포 중..."
    if firebase deploy --only hosting; then
        print_success "✅ 웹 애플리케이션 배포 완료"
    else
        print_error "❌ 웹 애플리케이션 배포 실패"
        exit 1
    fi
}

# 배포 후 검증
verify_deployment() {
    print_step "🔍 배포 검증 중..."
    
    # Firebase 호스팅 URL 가져오기
    HOSTING_URL=$(firebase hosting:sites:list | grep careconnect | awk '{print $2}' || echo "careconnect-444da.web.app")
    
    if [ -n "$HOSTING_URL" ]; then
        print_info "배포된 URL: https://$HOSTING_URL"
        
        # 사이트 응답 확인 (curl이 있는 경우)
        if command -v curl &> /dev/null; then
            print_info "사이트 응답 확인 중..."
            if curl -s -o /dev/null -w "%{http_code}" "https://$HOSTING_URL" | grep -q "200"; then
                print_success "✅ 사이트가 정상적으로 응답합니다"
            else
                print_warning "⚠️ 사이트 응답 확인 실패"
            fi
        fi
    fi
    
    # Firestore 규칙 확인
    print_info "Firestore 보안 규칙 확인 중..."
    if firebase firestore:rules:get &> /dev/null; then
        print_success "✅ Firestore 보안 규칙 활성화됨"
    else
        print_warning "⚠️ Firestore 보안 규칙 확인 실패"
    fi
}

# 배포 후 정리
post_deploy_cleanup() {
    print_step "🧹 배포 후 정리..."
    
    # 빌드 캐시 정리
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        print_info "빌드 캐시 정리 완료"
    fi
    
    # 임시 파일 정리
    if [ -d ".firebase" ]; then
        # .firebase 디렉토리의 로그 파일만 정리
        find .firebase -name "*.log" -delete 2>/dev/null || true
        print_info "Firebase 로그 파일 정리 완료"
    fi
}

# 배포 완료 알림
send_deployment_notification() {
    print_step "📢 배포 완료 알림..."
    
    local deployment_info=""
    deployment_info+="🚀 CareConnect 배포 완료!\n"
    deployment_info+="환경: $ENVIRONMENT\n"
    deployment_info+="시간: $(date)\n"
    deployment_info+="커밋: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')\n"
    
    if [ -n "$HOSTING_URL" ]; then
        deployment_info+="URL: https://$HOSTING_URL\n"
    fi
    
    echo -e "$deployment_info"
    
    # Slack 등 외부 알림 시스템이 있다면 여기에 추가
    # 예: curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$deployment_info\"}" $SLACK_WEBHOOK_URL
}

# 메인 실행 함수
main() {
    echo "🏗️ CareConnect 배포 스크립트 시작"
    echo "환경: $ENVIRONMENT"
    echo "시간: $(date)"
    echo
    
    # 배포 단계별 실행
    check_prerequisites
    confirm_production_deploy
    run_tests
    build_project
    deploy_to_firebase
    verify_deployment
    post_deploy_cleanup
    send_deployment_notification
    
    echo
    print_success "🎉 배포가 성공적으로 완료되었습니다!"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo
        print_info "📝 프로덕션 배포 후 확인사항:"
        echo "  1. 웹사이트 정상 동작 확인"
        echo "  2. 사용자 인증 테스트"
        echo "  3. 주요 기능 동작 테스트"
        echo "  4. 모바일 반응형 확인"
        echo "  5. 성능 모니터링 확인"
        echo "  6. 에러 로그 모니터링 설정"
    fi
}

# 스크립트 실행
main "$@"