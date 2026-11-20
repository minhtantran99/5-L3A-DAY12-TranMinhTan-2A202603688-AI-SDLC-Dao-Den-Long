# Bằng chứng kiểm chứng Phase 2 (`phase-2`)

| Yêu cầu | Cách kiểm chứng | Bằng chứng / Kết quả | Trạng thái |
|---|---|---|---|
| Hồi quy Phase 1 | `npm test` (4 test `phase1.test.js`) | 4/4 test Phase 1 đạt | Đạt |
| Lướt (`dash`) chuẩn số liệu | Unit test `Phase 2: Dash moves at 14 m/s for 12 ticks and triggers cooldown` | Di chuyển > 2.5 m, cooldown > 1.0 s | Đạt |
| Tạm dừng (`pause`) | Unit test `Phase 2: Pause freezes sim_tick and time_left_s while tick increments` | `state="paused"`, `sim_tick` & `time_left_s` đứng yên | Đạt |
| Gió Lạc cướp & rơi đom đóm | Unit test `Phase 2: Night 2 Drifter steals motes and drops them on Pulse` | `drifter_steal` (3), `drifter_drop` (3) | Đạt |
| Bùa Gió xóa hồi chiêu Lướt | Unit test `Phase 2: Night 2 Charm removes dash cooldown` | `charm_picked` C1, `dash_cd_s === 0` | Đạt |
| Headless Đêm 3 (21.600 tick) <= 30 s | Unit test `Phase 2: Night 3 full 21,600-tick headless run completes under 30s` | Hoàn thành trong `58.19 ms` | Đạt |
| Bản 3D Three.js build | `npm run build` | `vite build` thành công | Đạt |
