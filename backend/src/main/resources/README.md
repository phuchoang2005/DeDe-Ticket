# Profile config files

> [!IMPORTANT]
> Các file `application-dev.yml` / `application-prod.yml` chứa secret nên **bị gitignore**.
> Chạy lệnh sau để tạo chúng từ template trước khi chạy backend ngoài Docker:

```shell
cp application-dev-example.yml  application-dev.yml
cp application-prod-example.yml application-prod.yml
```

Sau đó điền các giá trị thật (vd: `APP_JWT_SECRET` ≥ 32 ký tự, thông tin DB) vào file vừa copy.
