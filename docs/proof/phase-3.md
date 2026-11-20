# Bằng chứng kiểm chứng Phase 3 (`phase-3`)

| Yêu cầu | Cách kiểm chứng | Bằng chứng / Kết quả | Trạng thái |
|---|---|---|---|
| Hồi quy Phase 1–2 | `npm test` (9 test cũ, 1 test cập nhật theo ADR-001) | 9/9 test đạt | Đạt |
| Hao dầu, `lantern_out`, thắp lại 5 đom đóm (+40) | `Phase 3: Lantern decays, goes out with lantern_out, and relights for 5 motes (+40 score)` | `lantern_out` phát đúng, `relight: true`, `score=65`, `capacity=12` | Đạt |
| Châm dầu `refuel`, bỏ qua đèn đầy | `Phase 3: Refuel lit lantern emits refuel event and ignores full lantern` | `refuel` (`amount=2, fuel=100`), lần 2 không trừ đom đóm | Đạt |
| Bóng Mực hút dầu `drain` & thưởng +15 | `Phase 3: Shade drains weak lantern (fuel < 30) and gives +15 on Pulse` | `S1` -> `drain`, Pulse -> `score=15` | Đạt |
| Thắng `dawn_survived` (>= 60% đèn) | `Phase 3: Dawn win requires >= 60% lanterns lit at time_left_s == 0` | `game_over` (`won`, `dawn_survived`) | Đạt |
| Bản 3D Three.js + chế độ mù màu | `npm run build` | `vite build` thành công | Đạt |
