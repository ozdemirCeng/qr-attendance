# Katki Rehberi

Bu repo tek kisilik (solo) gelistirme modeli ile yonetilir.

## Gelistirme Modeli (Solo)

- main: production/release
- develop: gunluk gelistirme
- feature/*: buyuk veya riskli islerde opsiyonel kisa omurlu dal
- fix/*: acil hata duzeltme dali
- chore/*: altyapi ve tooling isleri

## Temel Kurallar

- Gunluk gelistirme dogrudan develop uzerinde yapilabilir.
- Release icin onerilen akis develop -> main PR merge.
- Acil hotfix gerekiyorsa fix/* dali acilip main'e PR acilabilir.
- Her push oncesi lokal kalite kapisi zorunlu:
  - pnpm lint
  - pnpm build
  - pnpm test

## Branch Isim Formati

Asagidaki formatlar kullanilir:

- feature/<kebab-case>
- fix/<kebab-case>
- chore/<kebab-case>

Ornekler:

- feature/qr-token-service
- feature/attendance-scan-flow
- fix/location-accuracy-edge-case

## Commit Kurali (Conventional Commits)

Format:

<type>(<scope>): <kisa aciklama>

Type listesi:

- feat
- fix
- refactor
- chore
- test
- docs
- style
- perf

Scope listesi:

- auth
- events
- sessions
- qr
- attendance
- participants
- exports
- imports
- location
- db
- ui

Ornekler:

- feat(qr): implement hmac token generation
- fix(location): handle missing gps accuracy
- chore(db): add migration command docs

## Gunluk Gelistirme Akisi

1) Gelistirme dalini guncelle:

git checkout develop
git pull origin develop

2) Opsiyonel branch ac (buyuk/riskli islerde):

git checkout -b feature/<kebab-case>

3) Degisiklikleri test et ve commit et:

pnpm lint
pnpm build
pnpm test
git add .
git commit -m "feat(scope): kisa aciklama"

4) Push et:

- develop dogrudan akisi: git push origin develop
- branch akisi: git push -u origin feature/<kebab-case>

5) Release zamani:

- Onerilen: develop -> main PR
- Hotfix: fix/* -> main PR

## CI Kontrolleri

Asagidaki kontroller otomatik calisir:

- Push (develop ve main): lint, build, test
- PR (main hedefli): release source branch kontrolu
- PR ve push: commit mesaji conventional commit kontrolu

## GitHub Branch Protection (Manual)

Onerilen ayarlar:

1. main branch protection:
	- Require a pull request before merging
	- Restrict direct pushes
	- Require status checks to pass
2. develop branch protection (opsiyonel):
	- Require status checks to pass
3. Required status checks:
	- CI / Lint Build Test
	- Branch Name Check / Validate release source branch
	- Commit Message Check / Validate conventional commits

