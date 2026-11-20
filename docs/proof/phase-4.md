# Bằng chứng kiểm chứng Phase 4 (`phase-4` / `v1.0.0`)

| Yêu cầu | Cách kiểm chứng | Bằng chứng / Kết quả | Trạng thái |
|---|---|---|---|
| Hồi quy Phase 1–3 | `npm test` | 13/13 test Phase 1–3 đạt | Đạt |
| Bảng xếp hạng cục bộ & `--export-leaderboard` | `Phase 4: Leaderboard...` & `Export leaderboard CLI...` | Validate tên, sort top 10, xuất JSON đúng thứ tự | Đạt |
| Soak test 10 Đêm liên tiếp | `node --expose-gc --jitless src/cli/soak.js --seed 7 --nights 10 --out soak.json` | `crashes: 0`, `mem_start_mb: 40.3`, `mem_end_mb: 44.4` (`1.10x <= 1.2x`), `0.5s` | Đạt |
| Build sản phẩm Web/Three.js | `npm run build` | `vite build` thành công (`dist/`) | Đạt |
| Benchmark 1280×720 (`bench.json`) | `node src/cli/bench.js --seed 42 --duration 30 --out bench.json` (Edge WebGL) | `avg_fps: 142.6`, `p1_low_fps: 70.6`, `frame_ms_p95: 7.1`, `load_ms: 886`, `frames: 4281` | Đạt |
| Video demo `.mp4` | Quay màn hình chơi thử + chạy test | Cần bạn tự quay màn hình và đính kèm Release `v1.0.0` | Chờ quay video |
