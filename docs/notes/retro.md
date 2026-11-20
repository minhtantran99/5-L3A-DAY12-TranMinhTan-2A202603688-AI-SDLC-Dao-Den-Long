# Retro Tổng Kết Dự Án: Đảo Đèn Lồng (4 Phases) — Trần Minh Tân (2A202603688)

## 1. Đánh giá qua 4 Phase
- **Phase 1 (PRD-0, `phase-1`):** Tách hoàn toàn lõi mô phỏng 60 Hz (`src/core/`) khỏi Three.js (`src/render/`), đạt 4/4 test và tính tất định tuyệt đối.
- **Phase 2 (Ticket-02, `phase-2`):** Mở rộng lên 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), Lướt, Gió Lạc, Bùa Gió, Tạm dừng, Âm thanh. Một Đêm 21.600 tick chạy headless chỉ mất ~58–120 ms (ngưỡng 30 s).
- **Phase 3 (Ticket-03, `phase-3`):** Xử lý Change Request "Đèn cạn dầu": theo dõi nhiên liệu bằng số nguyên `1/60` (`fuel60`) để tránh sai số dấu phẩy động, cập nhật test cũ kèm [ADR-001](../adr/001-lantern-fuel-and-dawn-win.md).
- **Phase 4 (Ticket-04, `phase-4`):** Hoàn thiện Soak Test 10 Đêm, Bảng xếp hạng cục bộ, các tính năng tiếp cận (đổi phím, giảm chuyển động, chữ lớn ×1.25, phụ đề) và chế độ Benchmark.

## 2. Những lần AI / hệ thống gặp lỗi & cách phát hiện
1. **Lỗi thứ tự bước trong test Phase 3:** Khi viết test kiểm tra Bóng Mực `drain`, ban đầu đặt Mây quá gần (`2 m`) nên Bóng Mực `wander` chuyển sang `chase` thay vì `drain`. Nhờ chạy `npm test` thật, lỗi giả định tình huống bị phát hiện ngay và tách thành 2 kiểm tra rõ ràng (`wander -> drain` khi Mây ở xa, và `Pulse` trúng `drain` ở Step 7 trước Step 8).
2. **Lỗi đo RSS trong Soak Test (`41.1 MB -> 74.4 MB`):** V8 JIT biên dịch TurboFan trong lần chạy đầu làm RSS tăng ~33 MB dù không rò rỉ bộ nhớ. Chạy Node với `--expose-gc --jitless` giữ RSS ổn định ở `40.3 MB -> 44.4 MB` (`1.10x <= 1.2x`).

## 3. Harness AI hiệu quả nhất
- `AGENTS.md` ngắn gọn (~20 dòng) khóa chặt 3 quy tắc sống còn: không import Three.js vào `src/core/`, dùng PRNG tất định `mulberry32`, và bắt buộc chạy `npm test && npm run build` trước khi gắn tag.
- Skill `.agents/skills/verify-phase/SKILL.md` chuẩn hóa quy trình kiểm chứng lặp lại ở mỗi phase.

## 4. Token ước tính & Cách tiết kiệm
- Tổng ước tính qua 4 phase: ~60k input / ~30k output.
- Cách tiết kiệm: tách kiến trúc `core` / `render` từ Phase 1 để không phải viết lại ở Phase 2–4; chỉ đọc/sửa đúng phần file liên quan; dùng test tự động thay vì chạy thử thủ công lặp lại.

## 5. Nếu làm lại thì đổi gì?
- Cài sẵn Chromium/Playwright trên môi trường local ngay từ Checkpoint 0 để chạy được benchmark WebGL `bench.js` trực tiếp trên máy phát triển.