# Ghi chú Phase 3 — TICKET-03: Đèn cạn dầu (Contract v1.2)

## Thay đổi thiết kế
Xem chi tiết tại [ADR-001](../adr/001-lantern-fuel-and-dawn-win.md).

## Cập nhật kiểm chứng & Token
- Cập nhật `tests/phase1.test.js` (test thắp đèn không còn kết thúc sớm `all_lit`).
- Thêm `tests/phase3.test.js` kiểm tra: hao dầu & `lantern_out`, châm dầu `refuel`, Bóng Mực `drain` & thưởng `+15` khi Tỏa Sáng, thắng `dawn_survived`.
- Ước tính token Phase 3: ~14k input / ~7k output.
