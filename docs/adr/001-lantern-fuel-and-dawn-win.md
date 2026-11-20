# ADR-001: Chuyển mô hình Đèn có nhiên liệu & Luật thắng Bình Minh (Phase 3)

## Bối cảnh
Ở Phase 1–2, đèn thắp xong sẽ sáng vĩnh viễn và game kết thúc thắng ngay khi toàn bộ đèn sáng (`all_lit`). Playtest cho thấy người chơi giỏi hoàn thành Đêm quá nhanh (~2 phút), mất áp lực ở cuối Đêm.

## Quyết định
1. **Nhiên liệu đèn theo đơn vị nguyên `1/60` (`fuel60`):**
   - Mỗi đèn sáng tối đa `6000` (`100.0` fuel), tự hao `1/tick` (`1.0/s`), và bị Bóng Mực ở trạng thái `drain` hút `5/tick` (`5.0/s`) khi `fuel < 30`.
   - Lưu bằng số nguyên `fuel60` để tránh sai số dấu phẩy động khi chạy dài 18.000+ tick; chỉ chia `60` và làm tròn 1 chữ số thập phân khi xuất snapshot/event.
2. **Thay thế luật thắng sớm (`all_lit` → `dawn_survived`):**
   - Bỏ thắng sớm khi thắp đủ đèn. Người chơi phải sống sót tới hết giờ và giữ `litCount >= ceil(0.6 * totalLanterns)`.
   - Sửa test cũ `Phase 1: Mote pickup, deposit, and lantern_lit` để phản ánh luật mới kèm ghi chú lý do rõ ràng, không xóa/tắt âm thầm.

## Hệ quả
- Đèn tắt (`lantern_out`) chuyển `ever_lit = true` để thắp lại chỉ tốn `5` đom đóm.
- Công thức điểm chuyển sang thưởng theo từng đom đóm nạp (`+5`), thắp lại (`+40`), phá Bóng Mực đang hút dầu (`+15`), và thưởng bình minh theo nhiên liệu còn lại.
