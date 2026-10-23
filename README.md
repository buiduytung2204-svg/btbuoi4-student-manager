# Quản lý sinh viên / Student Manager

Ứng dụng React Native + Expo (TypeScript), lưu local bằng AsyncStorage.

## Video demo

[Xem hoặc tải video demo](videos/demo.mp4)

## Chạy ứng dụng

```sh
npm install
npm start
```

Mở bằng Expo Go tương thích SDK 58 trên điện thoại, hoặc nhấn `a` khi đã mở Android Emulator. Máy tính và điện thoại cần cùng mạng; nếu cần dùng `npx expo start --tunnel`.

```sh
npm run web       # xem trên trình duyệt
npm run android   # mở bằng Android Emulator
```

## Chức năng

- Màn hình danh sách: hiển thị avatar, họ tên, mã số, email; tìm kiếm theo các trường.
- Màn hình chi tiết: xem đầy đủ thông tin; nút sửa và xóa.
- Màn hình thêm/sửa dùng chung: kiểm tra trường bắt buộc, email, mã số không trùng (không phân biệt hoa/thường).
- Sửa và xóa chỉ thực hiện khi chọn **Có** trong hộp thoại xác nhận. Chọn **Không** giữ nguyên dữ liệu đã lưu.
- Avatar tùy chọn: URL HTTP(S) hoặc ảnh từ thiết bị. Ảnh chọn trên Android/iOS được sao chép vào thư mục tài liệu của ứng dụng, không phụ thuộc cache của thư viện ảnh. Ảnh lỗi hiển thị chữ viết tắt tên.
- AsyncStorage lưu danh sách JSON, đọc khi khởi động. Chỉ cập nhật giao diện sau khi ghi thành công; lỗi đọc không ghi đè dữ liệu cũ.
- Tự động Việt/Anh theo locale thiết bị (ngôn ngữ khác dùng tiếng Anh); tên trong giao diện và tên launcher đều có bản dịch. Tên launcher và thông báo quyền iOS cần bản native riêng, không thể đổi tên Expo Go.
- Hoạt động offline với dữ liệu và ảnh chọn từ thiết bị. Avatar URL cần mạng để tải ảnh.

## Đóng gói APK Android

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

EAS cần tài khoản Expo và kết nối dự án khi chạy lần đầu. Cấu hình `eas.json` đã có profile APK; chưa tạo APK hay tải dự án lên EAS trong workspace này. Hoặc dùng `npx expo run:android` nếu đã cài Android SDK.

## Kiểm tra

```sh
npx tsc --noEmit
npx expo export --platform android
npx expo export --platform web
npx playwright install chromium
npx playwright test
```

Playwright kiểm tra CRUD, validation, hủy/đồng ý xác nhận, dữ liệu sau tải lại và locale Việt/Anh trên web. Kiểm tra thêm trên thiết bị: chọn ảnh → lưu → đóng/mở app → xác nhận ảnh vẫn còn; đổi ngôn ngữ hệ thống → mở lại; thử nút Back và bàn phím. Kiểm thử web không thay thế kiểm thử quyền thư viện ảnh và filesystem native.

## Cấu trúc

- `src/app/`: ba route Expo Router và layout; `App.tsx`: state dùng chung, xác nhận, chọn ảnh và giao diện.
- `src/students.ts`: kiểu dữ liệu, validation, đọc/ghi AsyncStorage.
- `src/i18n.ts`: chuỗi giao diện Việt/Anh.
- `locales/`: tên app và quyền ảnh trên iOS.
- `plugins/withLocalizedName.js`: tên launcher Android theo locale.
- `tests/`: kiểm thử giao diện web.

Tham khảo: [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Expo localization](https://docs.expo.dev/guides/localization/), [AsyncStorage](https://react-native-async-storage.github.io/async-storage/docs/usage/).

Kết quả trong workspace: TypeScript và hai bài kiểm thử Playwright đã chạy thành công. Đã export JavaScript Android và web. Chưa kiểm thử trên điện thoại/giả lập, chưa tạo APK. `expo prebuild --platform android --no-install` trên máy này gặp lỗi không tìm thấy `MainApplication`; nếu build local, hãy thử checkout sang thư mục đường dẫn ASCII và cài Android SDK. EAS build cũng cần được kiểm chứng thực tế.

Lưu ý dependency: `npm audit` báo các mục high trong chuỗi dependency Expo/Metro (19 mục sau khi bổ sung Router). Đã chạy `npm audit fix`; không tự động ép về Expo cũ bằng `--force` vì gây thay đổi SDK không tương thích.
