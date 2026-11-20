# Đảo Đèn Lồng (Three.js) — `v1.0.0`

> **Học viên:** Trần Minh Tân (MSSV: `2A202603688` · Lớp: `K5-L3A`)  
> **Video demo:** [docs/demo/demo.mp4](docs/demo/demo.mp4) · GitHub Release: `v1.0.0`  
> **Lab board:** [Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)  

Game 3D góc nhìn thứ ba xây dựng bằng **Three.js** và lõi mô phỏng **60 Hz tất định bằng Node.js** qua 4 phase SDLC. Người chơi điều khiển Mây thu thập đom đóm, thắp sáng và giữ dầu cho các Đèn Lồng Lớn tới bình minh qua 3 Đêm (*Đảo Bến*, *Đảo Cau*, *Đảo Chuông*), né tránh Bóng Mực và Gió Lạc.

---

## Cài đặt & Chạy (tối đa 3 lệnh)

Yêu cầu: **Node.js >= 20** và trình duyệt hỗ trợ WebGL.

```bash
npm install --no-audit --no-fund
npm run build
npm run start
```

Sau đó mở trình duyệt tại `http://localhost:4173`.

---

## Điều khiển (có thể đổi trong Cài đặt)

| Hành động | Phím mặc định |
|---|---|
| Di chuyển | `W` `A` `S` `D` |
| Xoay camera | Kéo chuột |
| Nhảy | `Space` |
| Lướt (Dash) | `Shift` |
| Nạp ánh sáng / Châm dầu | `E` |
| Tỏa Sáng (Pulse) | `Q` |
| Tạm dừng | `Esc` |

---

## Cách tính điểm (Contract v1.2 / v1.3)

- `+5` điểm mỗi đom đóm nạp vào đèn (thắp mới, thắp lại, hoặc châm dầu).
- `+100` điểm khi thắp đèn lần đầu; `+40` điểm khi thắp lại đèn đã từng sáng.
- `+5` điểm mỗi Bóng Mực trúng Tỏa Sáng (`+15` điểm nếu Bóng Mực đang ở trạng thái `drain`).
- Khi thắng Đêm (sống tới bình minh với `>= ceil(0.6 × tổng đèn)` đèn sáng): `+50 + floor(fuel)` cho mỗi đèn đang sáng và `+50` cho mỗi Ngọn Lửa còn lại.

---

## Chạy Test, Headless, Soak & Benchmark

```bash
# 1. Chạy toàn bộ unit test & contract test (16 tests)
npm test

# 2. Chạy chế độ headless (Contract v1.3)
node src/cli/headless.js --seed 1 --night 1 --ticks 14400 --out out.jsonl

# 3. Chạy Soak Test 10 Đêm liên tiếp
node --expose-gc --jitless src/cli/soak.js --seed 7 --nights 10 --out soak.json

# 4. Chạy Benchmark 1280x720 (yêu cầu Google Chrome / Chromium trên máy chấm)
node src/cli/bench.js --seed 42 --duration 30 --out bench.json

# 5. Xuất Bảng xếp hạng cục bộ
node src/cli/run.js --export-leaderboard out.json
```

---

## Sáng tạo của tôi

- **Đom đóm tinh linh trang trí & âm thanh WebAudio tổng hợp:** 18 đom đóm tinh linh bay quanh đảo trong lớp hiển thị `src/render/` và hiệu ứng âm thanh tổng hợp bằng Web Audio API trong `src/render/AudioManager.js` (không phụ thuộc asset ngoài, tự động tắt trong chế độ headless và không làm thay đổi bất kỳ output JSONL nào).
- **Bằng chứng không phá lõi:** Toàn bộ 16/16 test (`npm test`) và tính tất định headless (`diff` giữa hai lần chạy cùng seed) đạt 100%.