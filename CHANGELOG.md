# Changelog

## [v1.0.0 / phase-4] — Contract v1.3 (Bình minh: Phát hành)
- Thêm chế độ benchmark 3D (`node src/cli/bench.js --seed 42 --duration 30 --out bench.json`).
- Thêm soak test 10 Đêm liên tiếp (`node --expose-gc --jitless src/cli/soak.js --seed 7 --nights 10 --out soak.json`).
- Thêm Bảng xếp hạng cục bộ (top 10 lưu đĩa `data/leaderboard.json`, hỗ trợ `--export-leaderboard out.json`).
- Thêm tính năng tiếp cận: đổi phím kèm cảnh báo trùng, phụ đề/cảnh báo hình ảnh, giảm chuyển động, chữ lớn ×1.25.
- Hoàn thiện tài liệu phát hành (`README.md`, `LICENSE`, `CREDITS.md`, `docs/notes/retro.md`).

## [phase-3] — Contract v1.2 (Change Request: Đèn cạn dầu)
### Breaking Changes
- **Luật thắng mới:** Bỏ thắng sớm `all_lit`. Thắng khi sống sót đến bình minh (`time_left_s == 0`) với ít nhất `ceil(0.6 × tổng đèn)` đèn đang sáng (`dawn_survived`).
- **Nhiên liệu đèn:** Đèn sáng mất `1.0/s`, có thể châm thêm (`refuel`) hoặc tắt (`lantern_out`), thắp lại tốn `5` đom đóm.
- **Bóng Mực hút dầu:** Đèn có `fuel < 30` mất vùng an toàn; Bóng Mực `wander` có thể chuyển sang `drain` hút `5/s`.
- **Thời lượng Đêm & Điểm:** Đêm 1/2/3 rút còn `240/270/300 s`; điểm mới (`+5`/đom đóm, `+100` thắp mới, `+40` thắp lại, `+15` Tỏa Sáng trúng Bóng Mực đang `drain`, thưởng bình minh theo nhiên liệu).

## [phase-2] — Contract v1.1 (Ba hòn đảo)
- Chuẩn hóa toàn bộ hằng số gameplay, 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), Lướt, Gió Lạc, Bùa Gió, Tạm dừng, Âm thanh, HUD đầy đủ.

## [phase-1] — Contract v1.0 (PRD-0)
- Phiên bản đầu tiên Đêm 1 — Đảo Bến với Three.js và chế độ headless 60 Hz.
