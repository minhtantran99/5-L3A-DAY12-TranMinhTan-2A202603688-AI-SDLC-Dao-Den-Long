# Bằng chứng kiểm chứng Phase 1 (`phase-1`)

| Yêu cầu | Cách kiểm chứng | Bằng chứng / Kết quả | Trạng thái |
|---|---|---|---|
| Dựng scenario không phát event/điểm | Unit test `Phase 1: Scenario setup emits no events and does not award points` | `npm test` pass (`tick=0, score=0, lit=true`) | Đạt |
| Nhặt đom đóm, nạp đèn, thắng Đêm 1 | Unit test `Phase 1: Mote pickup, deposit, lantern_lit, and win condition` | `npm test` pass (`deposit`, `lantern_lit`, `game_over won`) | Đạt |
| Tỏa Sáng làm choáng & đẩy Bóng Mực | Unit test `Phase 1: Pulse stuns and pushes shades in range` | `npm test` pass (`S1` -> `stunned`, `carried: 5 -> 2`) | Đạt |
| Tính tất định & mã lỗi 2 headless | Unit test `Phase 1: Headless CLI determinism and exit code 2 on invalid inputs` | Hai lần chạy `--seed 7 --ticks 120` giống nhau tuyệt đối; inputs lỗi thoát mã `2` | Đạt |
| Bản 3D Three.js build được | Chạy `npm run build` | `vite build` thành công (`dist/index.html`, `dist/assets/*.js`) | Đạt |

## Kết quả chạy thực tế (`npm test && npm run build`)
```text
✔ Phase 1: Scenario setup emits no events and does not award points (1.18ms)
✔ Phase 1: Mote pickup, deposit, lantern_lit, and win condition (0.86ms)
✔ Phase 1: Pulse stuns and pushes shades in range (0.31ms)
✔ Phase 1: Headless CLI determinism and exit code 2 on invalid inputs (96.09ms)
ℹ tests 4 | pass 4 | fail 0
✓ built in 875ms
```
