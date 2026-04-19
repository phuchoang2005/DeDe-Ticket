# Viết Commit chuẩn Github

Trong môi trường phát triển phần mềm chuyên nghiệp, chuẩn mực phổ biến nhất để viết commit message là **Conventional Commits**. Việc tuân thủ chuẩn này giúp lịch sử dự án (git log) sạch sẽ, dễ tra cứu và hỗ trợ các công cụ tự động hóa (như tự động tạo Changelog).

Dưới đây là cấu trúc chi tiết và cách áp dụng chuẩn công nghiệp.

---

## 1. Cấu trúc tổng quát (The Template)

Một commit "chuẩn" thường có cấu trúc 3 phần:

Plaintext

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Chi tiết các thành phần:

- **Type (Bắt buộc):** Loại thay đổi bạn thực hiện (feat, fix, docs...).
    
- **Scope (Tùy chọn):** Phạm vi ảnh hưởng (ví dụ: `auth`, `api`, `database`). Để trong dấu ngoặc đơn.
    
- **Description (Bắt buộc):** Mô tả ngắn gọn về thay đổi.
    
- **Body (Tùy chọn):** Giải thích chi tiết "Tại sao" và "Cái gì" (không phải "Làm thế nào").
    
- **Footer (Tùy chọn):** Dùng để đóng ticket (ví dụ: `Fixes #123`) hoặc thông báo Breaking Changes.
    

---

## 2. Các "Type" phổ biến nhất

| **Type**     | **Ý nghĩa**   | **Khi nào dùng?**                                                              |
| ------------ | ------------- | ------------------------------------------------------------------------------ |
| **feat**     | Feature       | Khi thêm một tính năng mới cho code base.                                      |
| **fix**      | Bug Fix       | Khi sửa một lỗi nào đó.                                                        |
| **docs**     | Documentation | Thay đổi file README, hướng dẫn sử dụng, comment code.                         |
| **style**    | Style         | Thay đổi định dạng code (khoảng trắng, dấu chấm phẩy...) mà không đổi logic.   |
| **refactor** | Refactor      | Sửa code nhưng không thêm tính năng cũng không sửa lỗi.                        |
| **perf**     | Performance   | Thay đổi giúp code chạy nhanh hơn hoặc tối ưu tài nguyên.                      |
| **test**     | Test          | Thêm hoặc sửa các bộ unit test.                                                |
| **chore**    | Chore         | Cập nhật thư viện, cấu hình build, công cụ hỗ trợ (không liên quan code chạy). |

---

## 3. 5 Nguyên tắc "Vàng" khi viết Description

Để commit chuyên nghiệp hơn, hãy ghi nhớ các quy tắc sau:

1. **Sử dụng thể mệnh lệnh (Imperative Mood):** Hãy viết như thể bạn đang ra lệnh cho code.
    
    - ✅ Nên: `feat: add login functionality`
        
    - ❌ Không nên: `Added login feature` hoặc `Adds login feature`.
        
2. **Không viết hoa chữ cái đầu của description:** Trừ khi đó là danh từ riêng.
    
3. **Không đặt dấu chấm ở cuối dòng:** Giữ cho tiêu đề ngắn gọn.
    
4. **Giới hạn độ dài:** Dòng tiêu đề nên dưới **50-72 ký tự**.
    
5. **Tách biệt Body bằng một dòng trống:** Nếu bạn cần viết chi tiết, hãy để một dòng trắng giữa tiêu đề và nội dung.
    

---

## 4. Ví dụ thực tế

### Ví dụ 1: Thêm tính năng mới (Có Scope)

Plaintext

```
feat(auth): add JWT token validation for login
```

### Ví dụ 2: Sửa lỗi và đóng Issue

Plaintext

```
fix(api): resolve null pointer exception in user controller

Fixes #45
```

### Ví dụ 3: Cập nhật tài liệu

Plaintext

```
docs: update setup instructions in README.md
```

### Ví dụ 4: Một commit đầy đủ (Complex)

Plaintext

```
feat(ui): implement dark mode switch

Add a toggle component to the navbar to allow users to switch
between light and dark themes. Persist preference in localStorage.

Fixes #102
```

---

## Lợi ích của việc viết chuẩn

- **Dễ đọc:** Đồng nghiệp nhìn vào là biết bạn vừa làm gì mà không cần đọc code.
    
- **Search nhanh:** Có thể dùng `git log --grep="fix"` để tìm tất cả các commit sửa lỗi.
    
- **Tự động hóa:** Các công cụ như _Standard Version_ có thể đọc các commit `feat` và `fix` để tự động nhảy version (Semantic Versioning) và tạo file `CHANGELOG.md` cho bạn.
    
