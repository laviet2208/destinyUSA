# Bàn giao build và cập nhật app iOS lên App Store

## 1. Phạm vi và thông tin cố định

Chỉ clone repo app khách: https://github.com/laviet2208/destinyUSA.git, nhánh master. Không cần repo destinyUSA-server, tài khoản VPS, database hoặc keystore Android.

| Thuộc tính | Giá trị hiện tại |
| --- | --- |
| Bundle ID iOS | destn.dstnm.destinymain |
| Apple Developer Team | 827H8UVFKV |
| Expo owner | vitla22 |
| Expo slug | destiny-usa-customer |
| Expo project ID | cd3200c2-c9ca-44ae-8504-030cdcca4c05 |
| API production | https://103-195-238-221.sslip.io |
| Cấu hình phát hành | eas.json → build.production |

Đây là bản cập nhật của app cũ, không tạo app/bundle ID/Expo project mới. Nếu Apple xác nhận app đã chuyển team, chủ dự án phải cập nhật team và provisioning phù hợp trước; người build không tự đổi các định danh để vượt lỗi quyền.

## 2. Chủ dự án chuẩn bị trước

- Quyền đọc GitHub repo; cần quyền ghi nếu người build sẽ commit cấu hình phiên bản.
- Quyền build đúng dự án Expo trên. Với tài khoản Personal, không chia sẻ mật khẩu; muốn phân quyền nhiều người cần Organization. Chủ dự án quyết định chuyển/convert phù hợp, giữ project ID và cập nhật owner nếu thực sự chuyển owner. Người build không tự tạo dự án khác khi thiếu quyền.
- Quyền vào đúng app cũ trên App Store Connect; tài khoản Apple Developer trả phí còn hiệu lực. Người có quyền chứng chỉ/provisioning phải tham gia thiết lập ký lần đầu nếu đội build chưa có quyền đó. Các yêu cầu hợp đồng mới do chủ tài khoản Apple xử lý.
- Apple ID dạng số của app cũ: App Store Connect → Apps → chọn app cũ → App Information → Apple ID. Đây không phải email Apple ID, Bundle ID hay Team ID.
- Gửi riêng hai file Firebase client: GoogleService-Info.plist và google-services.json từ project destiny-usa. File iOS phải có BUNDLE_ID=destn.dstnm.destinymain. Có thể tải lại từ Firebase Project settings → General → Your apps → đúng app iOS/Android.
- Cung cấp tài khoản test phía server qua kênh riêng; không ghi mật khẩu vào source, tài liệu hoặc Git.

Không gửi firebase-service-account.json, mật khẩu root/VPS, .env backend, khóa mã hóa database hoặc keystore Android cho đội chỉ phát hành iOS. Hai file Firebase client được .gitignore loại khỏi Git nhưng .easignore cho phép đóng gói vào EAS Build; chúng không thay thế APNs key.

## 3. Máy build và clone source

Cài Git và Node.js24 LTS. EAS cloud build/submit chạy được từ Windows hoặc macOS; không bắt buộc có Mac. Mac/Xcode chỉ cần khi muốn build/debug native trực tiếp. Cần iPhone thật để kiểm tra bản TestFlight.

Mở terminal trong thư mục muốn chứa source:

```sh
git clone https://github.com/laviet2208/destinyUSA.git
cd destinyUSA
git branch --show-current
git pull --ff-only origin master
npm ci
```

Nhánh phải là master. Không chạy npm audit fix --force, không tự nâng/hạ Expo/React Native để bỏ qua cảnh báo. Không cần có sẵn thư mục ios: EAS sẽ prebuild từ app.config.ts.

Chép hai file Firebase đã nhận vào thư mục gốc, ngang hàng package.json:

```text
destinyUSA/
  app.config.ts
  eas.json
  .easignore
  package.json
  GoogleService-Info.plist
  google-services.json
  src/
```

Nếu cần chạy/test local, sao chép .env.example thành .env:

```sh
cp .env.example .env
```

PowerShell dùng Copy-Item .env.example .env. API phải là HTTPS VPS ở mục1, không dùng localhost. EAS production đã có EXPO_PUBLIC_API_URL; không đưa bí mật server vào biến EXPO_PUBLIC_*.

## 4. Đăng nhập Expo và kiểm tra

```sh
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx eas-cli@latest env:list --environment production
npm run typecheck
npm test
npx expo-doctor
```

project:info phải trỏ đúng project ID ở mục1. Tài khoản đăng nhập phải có quyền truy cập; không sửa owner/projectId hoặc chạy init tạo dự án mới khi bị từ chối. Biến production EXPO_PUBLIC_API_URL phải trỏ đúng API VPS. Nếu thiếu, chủ dự án cấu hình lại trên đúng dự án trước khi build.

Nếu công cụ báo lỗi, xử lý lỗi có căn cứ; không coi việc build cloud bắt đầu là xác nhận app đã hoạt động trên iOS. App dùng Firebase native nên không kiểm thử bằng Expo Go.

## 5. Chọn version và build number

Vào App Store Connect của app cũ, kiểm tra cả bản đang phát hành và các build đã upload/TestFlight. Mở app.config.ts:

- version: phiên bản người dùng thấy. Chọn phiên bản cập nhật cao hơn bản đã phát hành, hoặc đúng phiên bản chưa phát hành đang chuẩn bị.
- ios.buildNumber: chuỗi số nguyên, chọn số cao hơn các build đã upload để tránh trùng. Mỗi lần rebuild để upload lại tăng số này.
- Không thay ios.bundleIdentifier, ios.appleTeamId, extra.eas.projectId hoặc Android package.

Cấu hình ban đầu trong repo là version1.0.9/build9, không có nghĩa chắc chắn Apple còn nhận build9. Ví dụ chỉ khi App Store hiện1.0.8 và build cao nhất8 thì1.0.9/build9 mới phù hợp. Nếu cao nhất đã là15 thì chọn build16 hoặc cao hơn.

eas.json dùng appVersionSource=local nên phải lưu thay đổi trong app.config.ts; không trông chờ tự tăng build number. Commit/push riêng cấu hình phiên bản sau khi đã rà soát, không git add các file bí mật.

## 6. Signing và push notification iOS

Profile production hiện dùng credentialsSource=remote. Người được chủ dự án ủy quyền thiết lập hoặc kiểm tra credentials của đúng app/team:

```sh
npx eas-cli@latest credentials --platform ios
```

Chọn production. Dùng Apple Distribution certificate và App Store provisioning profile còn hạn cho đúng bundle/team; có thể tái sử dụng credentials hợp lệ hoặc cấp mới phù hợp. Không cần giữ đúng một chứng chỉ iOS cũ như quy tắc keystore Android. Không revoke chứng chỉ đang dùng cho các app khác.

Lần đầu EAS có thể yêu cầu Apple login và2FA; chủ tài khoản hoặc người được cấp quyền thực hiện trực tiếp. Chỉ bỏ qua Apple login nếu remote credentials đã đầy đủ, hợp lệ và chủ dự án xác nhận. Nếu thiếu quyền ký thì dừng và nhờ người có quyền chuẩn bị, không chọn Apple team cá nhân khác.

Với Firebase Messaging, cần đồng thời:

1. App ID đúng bundle trên Apple Developer có Push Notifications; provisioning profile chứa entitlement tương ứng.
2. APNs authentication key .p8 của đúng Apple team được chủ dự án cấu hình tại Firebase → Project settings → Cloud Messaging → Apple app configuration, kèm Key ID/Team ID theo giao diện Firebase.
3. GoogleService-Info.plist đúng app được đóng gói vào bản build.
4. Kiểm thử quyền thông báo, foreground/background và bấm mở thông báo trên iPhone/TestFlight.

Tạo APNs key trên EAS không tự có nghĩa Firebase đã được cấu hình key đó. Không commit .p8 hoặc service account vào repo. FCM backend trên VPS đã bật nhưng chưa xác nhận giao push iOS thật.

## 7. Build IPA trên Expo

```sh
npx eas-cli@latest build --platform ios --profile production
```

Không dùng --local nếu build cloud, không dùng profile Android preview để thay cho bản iOS App Store. Nếu được hỏi tạo app/project mới do sai quyền hoặc sai cấu hình thì dừng kiểm tra.

Theo dõi job trên https://expo.dev/accounts/vitla22/projects/destiny-usa-customer/builds. Nếu chủ dự án chuyển owner, dùng trang của owner mới nhưng project ID vẫn phải khớp. Khi Finished, lưu build ID của đúng job iOS/version/build number. IPA production phân phối qua TestFlight/App Store, không cài trực tiếp như APK.

## 8. Upload đúng app cũ lên App Store Connect

Trước khi submit, thêm ios.ascAppId vào riêng mục submit.production của eas.json, giữ nguyên toàn bộ cấu hình build đang có:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "THAY_BANG_APPLE_ID_DANG_SO_CUA_APP_CU"
    }
  }
}
```

Đây là đoạn cấu hình cần ghép vào file, không phải thay toàn bộ eas.json. Phải thay chuỗi hướng dẫn bằng Apple ID thực tế, không đoán số và không tạo record app mới. Chủ dự án có thể chuẩn bị App Store Connect API key cho EAS Submit hoặc làm theo luồng Apple authentication hợp lệ của CLI; key submit không phải APNs key.

```sh
npx eas-cli@latest submit --platform ios --profile production
```

Chọn build có sẵn trên EAS rồi chọn chính xác job iOS ở mục7. Không chọn nhầm build cũ; kiểm tra version/build number. Đợi Apple xử lý rồi kiểm tra tab TestFlight. Upload thành công chưa phải được Apple duyệt hay phát hành công khai.

## 9. TestFlight và gửi duyệt

- Cài build bằng TestFlight trên iPhone thật; kiểm tra đăng nhập, mã giới thiệu, ảnh/sản phẩm, hai giỏ/voucher, đơn hàng, ví, chat/ảnh/đã xem, thông báo, Viber, ngôn ngữ và bàn phím/Safe Area.
- Thử đặt hàng/tặng voucher/nạp rút chỉ với tài khoản và dữ liệu được chủ dự án cho phép; không tạo giao dịch trên tài khoản khách thật để test.
- Trong App Store Connect, dùng app cũ → tạo/chọn phiên bản iOS cập nhật → chọn build đã test.
- Hoàn tất mô tả thay đổi, screenshot theo kích thước Apple yêu cầu, Privacy Policy URL công khai, App Privacy và các câu hỏi compliance theo hành vi thật của app/SDK.
- App Review Information cần tài khoản test dùng được, hướng dẫn vượt màn mã giới thiệu theo nghiệp vụ hợp lệ, thông tin liên hệ và giải thích cách thử. Không công khai mật khẩu test trong source hoặc ghi chú phát hành.
- Chọn phát hành thủ công nếu chủ dự án muốn kiểm soát thời điểm; gửi App Review và xử lý phản hồi trước khi phát hành.

Lưu ý quan trọng: thông báo đã nhận yêu cầu xóa rồi logout không tự chứng minh có xóa tài khoản thật. Luồng xử lý phải thực sự hỗ trợ hoàn tất xóa theo chính sách Apple. Chủ dự án cần rà soát trước khi gửi duyệt; tài liệu này không xác nhận app đã đạt App Review.

## 10. Các lần cập nhật sau

```sh
git status
git pull --ff-only origin master
npm ci
npm run typecheck
npm test
```

Nếu có thay đổi local, xử lý/commit đúng trước khi pull; không reset bỏ công việc của người khác. Giữ lại hai file Firebase client local, kiểm tra API và quyền Expo. Tăng version/build phù hợp rồi lặp mục7–9. Push Git không tự cập nhật App Store; hiện không có quy trình OTA EAS Update đã được xác nhận cho repo này.

## Tài liệu chính thức

- Expo build/submit iOS: https://docs.expo.dev/submit/ios/
- Cấu hình submit/ascAppId: https://docs.expo.dev/submit/eas-json/
- Phân quyền nhóm Expo: https://docs.expo.dev/accounts/account-types/
- Đóng gói file ngoài Git: https://docs.expo.dev/build-reference/easignore/
- Firebase/APNs: https://firebase.google.com/docs/cloud-messaging/ios/get-started
- Apple account deletion: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

Trạng thái bàn giao17/10/2026: đã chạy Android debug ở phiên trước và kiểm tra web/API; chưa xác nhận build iOS, APNs thật hoặc App Review. Không bỏ qua TestFlight vì web đã chạy được.
