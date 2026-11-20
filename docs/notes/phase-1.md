# Ghi chú Phase 1 — PRD-0: Đảo Đèn Lồng

## 1. Giả định cho các phần mơ hồ của PRD-0
- **Hình dạng & kích thước đảo:** Đảo tròn tâm `(0, 0, 0)`, bán kính `40 m`, mặt đất `Y = 0`, rơi xuống `Y < -10` mất 1 Ngọn Lửa và hồi sinh tại `(0, 0, 0)` sau 1 giây (`60 tick`).
- **Thông số Mây:** Tốc độ chạy `6.0 m/s`, nhảy `7.0 m/s` (trọng lực `-20 m/s²`), sức chứa `10` đom đóm, `3` Ngọn Lửa, bất tử `1.5 s` sau khi bị đánh, đánh rơi `50%` số đom đóm đang mang.
- **Đèn Lồng Lớn:** 5 đèn (`L1..L5`) bố trí đối xứng quanh đảo, mỗi đèn cần `10` đom đóm để thắp (có thể nạp nhiều lần), bán kính tương tác `2.0 m`, vùng an toàn bán kính `6.0 m`.
- **Tỏa Sáng (Pulse):** Tiêu hao `3` đom đóm, bán kính `5.0 m`, làm choáng `2.0 s` và đẩy lùi `4.0 m`, hồi chiêu `3.0 s`.
- **Bóng Mực:** Tốc độ `4.0 m/s`, phát hiện ở `12 m`, bỏ đuổi ở `18 m`, chạm gây sát thương ở `1.0 m`, tối đa 6 con.
- **Thời lượng & Điểm:** Đêm 1 dài `300 s`; `+10` điểm/đom đóm nạp, `+100`/đèn thắp, `+5`/Bóng Mực choáng, khi thắng `+2`/giây còn lại và `+50`/Ngọn Lửa còn lại.

## 2. Tiêu chí nghiệm thu (Acceptance Criteria)
- Logic tách rời khỏi Three.js trong `src/core/`, chạy 60 tick/giây cố định.
- Chế độ headless tuân thủ Test Contract v1.0, tất định với cùng `--seed`, `--scenario`, `--inputs`.
- Bản 3D Three.js hiển thị Mây (nón lá + đèn nhỏ), 5 đèn lồng, đom đóm, Bóng Mực, HUD, thắng/thua và chơi lại được.

## 3. Nhật ký dùng AI & Token (Phase 1)
- Thiết kế kiến trúc tách `src/core/` và `src/render/` ngay từ đầu để tránh viết lại khi nâng cấp Phase 2–4.
- Ước tính token Phase 1: ~18k input / ~9k output. Cách tiết kiệm: đọc đủ yêu cầu một lần, lập kế hoạch kiểm chứng trước khi sinh code, giữ `AGENTS.md` ngắn gọn.
