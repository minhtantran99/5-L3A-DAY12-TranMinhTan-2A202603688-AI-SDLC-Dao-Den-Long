# Ghi chú Phase 2 — TICKET-02: Ba hòn đảo (Contract v1.1)

## 1. Cập nhật thông số & giả định theo Ticket-02
- Chuẩn hóa toàn bộ hằng số trong `src/core/config.js` và `game.contract.json` (`v1.1`).
- Bổ sung 3 bản đồ chuẩn trong `src/core/maps.js`: Đêm 1 (Đảo Bến), Đêm 2 (Đảo Cau với cầu tre + 2 bục nhảy + Bùa Gió), Đêm 3 (Đảo Chuông 3 tầng + 2 dốc + bục nhảy + tháp chuông + gió mạnh).
- Thứ tự xử lý 12 bước trong mỗi tick được thực thi nghiêm ngặt trong `src/core/sim.js`.

## 2. Tiêu chí nghiệm thu mới
- Lướt (`dash`): 14 m/s trong 12 tick, hồi chiêu 90 tick, giữ nguyên độ cao trên không.
- Tạm dừng (`pause`): đóng băng `sim_tick`, thời gian và bộ đếm, `tick` vẫn tăng, snapshot ghi `state: "paused"`.
- Gió Lạc (`drifter`): cướp tối đa 3 đom đóm khi Mây mang >= 5 và cách <= 15 m, trúng Tỏa Sáng khi đang `flee` sẽ thả lại đom đóm rơi.
- Bùa Gió (`charm`): 600 tick tăng tốc 7.2 m/s và Lướt không hồi chiêu, hồi sinh sau 2700 tick.
- Hiệu năng headless: 1 Đêm đầy đủ (21.600 tick) chạy xong dưới 30 giây.

## 3. Nhật ký dùng AI & Token (Phase 2)
- Cập nhật `AGENTS.md` để bổ sung quy tắc `src/core/maps.js` và 12 bước tick.
- Ước tính token Phase 2: ~16k input / ~8k output.
