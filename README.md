# Note

로컬 퍼스트 노트/플래시카드/캘린더를 한 앱에서 관리하는 Electron 데스크톱 앱입니다.

## 핵심 기능
- 폴더 트리 기반 노트 관리 (메타/본문 분리 저장)
- Markdown 편집/미리보기, GFM/KaTeX 지원
- 이미지 붙여넣기/드래그 앤 드롭 저장 후 자동 삽입
- 자동 저장 + 수동 저장, 미리보기 전용 모드
- 플래시카드 폴더/카드 CRUD, 질문/답변 플립
- 월간 캘린더, 일정 유형/중요 표시, 멀티데이 일정

## 구현 포인트
- 노트 본문을 `notes/*.md`, 메타를 `notes-meta.json`으로 분리해 대용량 데이터에도 안정적으로 동작
- 이미지 리소스를 로컬에 저장하고, 미사용 파일을 주기적으로 정리
- Electron `userData` 하위에 데이터 저장하여 OS별 표준 경로 사용

## 기술 스택
- Electron, React, TypeScript, Vite
- Tailwind CSS, Framer Motion
- Markdown: @uiw/react-md-editor, remark-gfm, rehype-katex
- date-fns, lucide-react

## 실행 방법
### 준비
- Node.js 18+ (권장)

### 설치/실행
```bash
npm install
npm run build
npm run electron
```

### 개발 모드
```bash
npm run dev
```
- Electron에서 Vite HMR을 쓰려면 `src/main/main.cjs`의 `win.loadURL('http://localhost:5173')`을 활성화하고 `loadFile`을 비활성화하세요.

## 폴더 구조
```text
src/
  main/        # Electron main/preload
  components/  # UI
  assets/
```
