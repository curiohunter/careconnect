#!/bin/bash

# CareConnect Firebase 백업 스크립트
# 사용법: ./backup.sh [dev|prod]

set -e  # 에러 발생시 스크립트 중단

# 환경 설정
ENVIRONMENT=${1:-dev}
BACKUP_DIR="./backups"
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

# Firebase 프로젝트 설정
if [ "$ENVIRONMENT" = "prod" ]; then
    PROJECT_ID="careconnect-444da"
    BACKUP_PREFIX="prod"
else
    PROJECT_ID="careconnect-444da"  # 개발용도 같은 프로젝트 사용 중
    BACKUP_PREFIX="dev"
fi

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

print_info "🚀 CareConnect 백업 시작..."
print_info "환경: $ENVIRONMENT"
print_info "프로젝트: $PROJECT_ID"
print_info "백업 디렉토리: $BACKUP_DIR"

# Firebase CLI 설치 확인
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI가 설치되지 않았습니다."
    print_info "설치 명령어: npm install -g firebase-tools"
    exit 1
fi

# Firebase 로그인 확인
if ! firebase projects:list &> /dev/null; then
    print_warning "Firebase에 로그인이 필요합니다."
    firebase login
fi

# 프로젝트 선택
firebase use "$PROJECT_ID"

# 1. Firestore 데이터 백업
print_info "📦 Firestore 데이터 백업 중..."
FIRESTORE_BACKUP_FILE="$BACKUP_DIR/${BACKUP_PREFIX}_firestore_${DATE}.json"

if firebase firestore:export "$FIRESTORE_BACKUP_FILE"; then
    print_success "Firestore 백업 완료: $FIRESTORE_BACKUP_FILE"
else
    print_error "Firestore 백업 실패"
    exit 1
fi

# 2. Firebase 보안 규칙 백업
print_info "🔒 보안 규칙 백업 중..."
RULES_BACKUP_DIR="$BACKUP_DIR/rules_${DATE}"
mkdir -p "$RULES_BACKUP_DIR"

# Firestore 규칙
if [ -f "firestore.rules" ]; then
    cp firestore.rules "$RULES_BACKUP_DIR/firestore.rules"
    print_success "Firestore 규칙 백업 완료"
fi

# Storage 규칙
if [ -f "storage.rules" ]; then
    cp storage.rules "$RULES_BACKUP_DIR/storage.rules"
    print_success "Storage 규칙 백업 완료"
fi

# 3. Firebase 설정 백업
print_info "⚙️ Firebase 설정 백업 중..."
CONFIG_BACKUP_DIR="$BACKUP_DIR/config_${DATE}"
mkdir -p "$CONFIG_BACKUP_DIR"

# firebase.json
if [ -f "firebase.json" ]; then
    cp firebase.json "$CONFIG_BACKUP_DIR/firebase.json"
fi

# .firebaserc
if [ -f ".firebaserc" ]; then
    cp .firebaserc "$CONFIG_BACKUP_DIR/.firebaserc"
fi

# firestore.indexes.json
if [ -f "firestore.indexes.json" ]; then
    cp firestore.indexes.json "$CONFIG_BACKUP_DIR/firestore.indexes.json"
fi

print_success "Firebase 설정 백업 완료"

# 4. 환경변수 백업 (민감 정보 제외)
print_info "🔐 환경설정 백업 중..."
ENV_BACKUP_DIR="$BACKUP_DIR/env_${DATE}"
mkdir -p "$ENV_BACKUP_DIR"

# package.json (의존성 정보)
if [ -f "package.json" ]; then
    cp package.json "$ENV_BACKUP_DIR/package.json"
fi

# 환경변수 템플릿 (실제 값은 제외)
cat > "$ENV_BACKUP_DIR/.env.template" << EOF
# CareConnect 환경변수 템플릿
# 실제 운영에서는 아래 값들을 설정하세요

VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
EOF

print_success "환경설정 백업 완료"

# 5. 백업 메타데이터 생성
print_info "📋 백업 메타데이터 생성 중..."
METADATA_FILE="$BACKUP_DIR/backup_metadata_${DATE}.json"

cat > "$METADATA_FILE" << EOF
{
  "backup_info": {
    "timestamp": "$(date -Iseconds)",
    "environment": "$ENVIRONMENT",
    "project_id": "$PROJECT_ID",
    "backup_version": "1.0.0"
  },
  "files": {
    "firestore_data": "${FIRESTORE_BACKUP_FILE}",
    "rules_directory": "${RULES_BACKUP_DIR}",
    "config_directory": "${CONFIG_BACKUP_DIR}",
    "env_directory": "${ENV_BACKUP_DIR}"
  },
  "collections_backed_up": [
    "users",
    "userProfiles", 
    "inviteCodes",
    "connections",
    "children",
    "schedules",
    "mealPlans",
    "medications",
    "specialSchedules",
    "workSchedules",
    "recurringSchedules"
  ],
  "backup_size": "$(du -sh $BACKUP_DIR | cut -f1)"
}
EOF

print_success "백업 메타데이터 생성 완료: $METADATA_FILE"

# 6. 백업 압축 (선택사항)
print_info "🗜️ 백업 압축 중..."
ARCHIVE_NAME="${BACKUP_PREFIX}_backup_${DATE}.tar.gz"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_DIR" . \
    --exclude="$ARCHIVE_NAME"

print_success "백업 압축 완료: $BACKUP_DIR/$ARCHIVE_NAME"

# 7. 백업 검증
print_info "✅ 백업 검증 중..."
if [ -f "$FIRESTORE_BACKUP_FILE" ] && [ -d "$RULES_BACKUP_DIR" ]; then
    print_success "백업 검증 성공!"
else
    print_error "백업 검증 실패!"
    exit 1
fi

# 8. 백업 정리 (30일 이상 된 백업 파일 삭제)
print_info "🧹 오래된 백업 정리 중..."
find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*" -type f -mtime +30 -delete 2>/dev/null || true
print_success "백업 정리 완료"

# 완료 메시지
print_success "🎉 백업 완료!"
echo
echo "📊 백업 요약:"
echo "  - 환경: $ENVIRONMENT"
echo "  - 시간: $(date)"
echo "  - 크기: $(du -sh $BACKUP_DIR | cut -f1)"
echo "  - 위치: $BACKUP_DIR"
echo
echo "📝 복원 방법:"
echo "  ./restore.sh $ARCHIVE_NAME"