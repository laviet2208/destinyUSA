# Destiny USA — app khách độc lập

## GitHub và Expo
- Quy trình bàn giao clone → build iOS → TestFlight → cập nhật App Store: [IOS_RELEASE.md](IOS_RELEASE.md).
- Source app khách: https://github.com/laviet2208/destinyUSA
- Expo project: https://expo.dev/accounts/vitla22/projects/destiny-usa-customer
- Đã build APK preview thành công trên EAS ngày17/10/2026: https://expo.dev/accounts/vitla22/projects/destiny-usa-customer/builds/420682b8-b811-4147-86fe-9462e0f28e73. Chưa build IPA hoặc phát hành Store. App có RNFirebase native nên không chạy bằng Expo Go; APK build thành công không thay thế kiểm thử thiết bị thật/push.
- API VPS: https://103-195-238-221.sslip.io. Biến EXPO_PUBLIC_API_URL được cấu hình trên EAS preview/production; khi build local dùng .env.example làm mẫu. Không dùng localhost của máy tính cho điện thoại thật.
- Repository không chứa admin/backend/database, .env, Firebase service account hoặc khóa ký. Cần cung cấp hai file Firebase client và keystore cũ riêng theo các mục bên dưới khi build/phát hành.

Thư mục này không phụ thuộc mã nguồn admin/backend và không thuộc npm workspace của hai phần đó. Chỉ bàn giao thư mục này cho đội phát hành app. Giao diện mobile đang được triển khai theo `Codex_UI_UX_Premium_Purple_Only.txt`, kết nối API nội bộ thay vì Firebase Auth. Chỉ phát hành sau khi kiểm thử đầy đủ trên thiết bị Android/iOS.

## Cài đặt

1. Dùng Node 22.13+ hoặc Node 24.3+. Trong thư mục này chạy `npm ci`, sau đó `npx expo install --check`, `npx expo-doctor` và `npm run typecheck`. Lockfile hiện dùng Expo 57.0.30, React Native 0.86.3, React 19.2.3; hai module RNFirebase cùng phiên bản 26.4.0. Không chạy `npm audit fix --force` hoặc nâng framework hàng loạt.
2. Không thay `android.package`, `ios.bundleIdentifier`, Apple team hoặc icon nếu chưa được phép. `index.ts` là entry point. Thư viện UI dùng React Navigation 7, Safe Area Context, Expo Image, Lucide và `@native-html/render`; không dùng HTML renderer cũ đã ngừng hỗ trợ.
3. Sao chép `.env.example` thành `.env`, cấu hình URL API HTTPS của server. Không đưa khóa mã hóa, DATABASE_URL, Firebase service account hoặc mã admin vào app.
4. Lấy hai file cấu hình Firebase client từ chủ dự án: `google-services.json`, `GoogleService-Info.plist`. Chúng phải thuộc project `destiny-usa`, đúng bundle/package cũ.
5. Dùng development build, không dùng Expo Go cho RNFirebase. iOS build/test cần macOS/Xcode hoặc EAS và Apple Developer; chưa được kiểm thử iOS trên máy Windows.

## Chạy Android local trên Windows

Cần JDK 17 và Android SDK. Cấu hình dùng compileSDK36, targetSDK36, minSDK24 tương thích React Native hiện tại. Trong SDK Manager cài `platforms;android-36`, `build-tools;36.0.0`; NDK/CMake còn thiếu sẽ được Gradle yêu cầu. Không ép compileSDK37: bản SDK đó cài dưới tên android-37.0 nhưng một số thư viện hiện yêu cầu android-37, làm EAS build lỗi. Target SDK và định danh phát hành không đổi.

Ví dụ PowerShell với emulator Android mặc định:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:APP_VARIANT = 'development'
$env:EXPO_PUBLIC_API_URL = 'http://10.0.2.2:4100'
npm run android
```

`10.0.2.2` chỉ dùng cho emulator Android trên máy đang chạy API. Thiết bị thật cần URL HTTPS hoặc IP LAN của máy phát triển cùng mạng, không dùng `localhost` của điện thoại. Chỉ `APP_VARIANT=development` mới bật HTTP trên Android; bản production mặc định chặn cleartext. Thay biến native này phải tạo lại development build. Không đưa `.env` hoặc thông tin server riêng vào gói bàn giao công khai.

Chạy Metro sau khi đã cài development build: `npm run start:local`. Script này ưu tiên IPv4 khi dùng localhost để adb reverse trên Windows không gặp lỗi EOF vì Metro chỉ nghe `::1`. Có thể dùng `npm start` khi chủ động cấu hình truy cập qua LAN. Bản debug local dùng debug signing của môi trường; bản release tiếp tục dùng keystore cũ thông qua hướng dẫn ký bên dưới, không thay khóa phát hành. Không gỡ app thật hoặc cài debug đè bản Store chỉ để vượt lỗi khác chữ ký.

## Bản web mobile để test

Dùng chung `App.tsx`, màn hình, navigation, API và nghiệp vụ với Android/iOS; không có một bộ giao diện web viết lại. Mở `http://127.0.0.1:5174/`: trên PC giới hạn trong khung điện thoại rộng tối đa 430px, trên màn hình nhỏ tự co theo màn hình. Khung iframe giúp gallery, danh sách, modal và `useWindowDimensions` cùng đo đúng chiều rộng điện thoại, không lấy chiều rộng desktop.

Từ thư mục hệ thống `destiny-usa-v2`:

```powershell
npm run build:customer
npm run dev:customer
```

API và PostgreSQL phải đang chạy; mở terminal khác chạy `npm run db:local`, `npm run dev:api` nếu cần. Không thay cổng admin 5173. Trong riêng thư mục mobile, các lệnh tương đương là `npm run web:build` và `npm run web`. Sau khi sửa source, build lại rồi tải lại trang; đây là bản production export để test, không phải Metro hot reload.

Kết quả nằm trong `dist-web/`, gồm trang bọc mobile ở `index.html`, app thật ở `app/index.html` và assets chung. Server preview chỉ phục vụ thư mục build; proxy `/api` và `/socket.io/` sang API local cổng4100, giữ Bearer token, multipart và idempotency key. Không cần nới CORS hay nhúng khóa server vào client. Nếu dùng API khác, đặt `API_PROXY_TARGET` thành origin HTTP/HTTPS khi chạy preview. Build web mặc định không lấy URL Android từ `.env`; chỉ đặt `EXPO_PUBLIC_WEB_API_URL` khi muốn bundle gọi trực tiếp một API HTTPS đã cấu hình CORS.

Web dùng IndexedDB và AES-GCM với khóa không xuất được thay SecureStore; giữ lựa chọn ngôn ngữ, phiên đăng nhập và đơn đang chờ. Đây là bộ nhớ của trình duyệt, không phải Android Keystore/iOS Keychain và không chống được mã độc/XSS cùng origin. Xóa dữ liệu trang web sẽ xóa cả phiên và đơn chờ trên trình duyệt. Tùy chọn lưu mật khẩu vẫn do người dùng bật, không bật mặc định.

Đã nối upload ảnh bằng `File`/multipart của trình duyệt và hộp thoại xác nhận thật; native vẫn dùng adapter cũ. Hộp thư thông báo trong app và chat dùng API/realtime thật. **Push FCM native, mở Viber, quyền thiết bị, bàn phím/gesture và kết xuất font của Android/iOS vẫn phải test trên thiết bị**; nút bật push trên web báo rõ giới hạn, không giả báo thành công. Bản web không đảm bảo giống từng pixel hoặc thay thế kiểm thử native.

Chỉ chạy localhost/HTTPS để WebCrypto hoạt động. Preview mặc định chỉ nghe `127.0.0.1`, không tự mở mạng LAN. Nếu đưa lên VPS, cần HTTPS và cấu hình reverse proxy cho cả `/api` lẫn `/socket.io/`; không coi script preview là cấu hình production đầy đủ.

## Giao diện và luồng đã nối
- Auth dùng bố cục Destiny_USA_Auth_Luxury_Violet.html: welcome nền tím với ảnh nhúng được đóng gói local, form sáng, logo biểu tượng + chữ nằm ngang dùng chung trong app. Đăng ký có xác nhận mật khẩu phía UI, không có mục mã giới thiệu tùy chọn; mã giới thiệu bắt buộc vẫn xử lý ở màn riêng sau đăng ký theo trạng thái server. Không thêm API hoặc sao chép JavaScript demo, không thêm nút khôi phục/điều khoản giả. Nội dung auth mới có đủ12ngôn ngữ.
- Bố cục mua sắm theo `Violet_Premium_Commerce_Demo.html`: header tím/tìm kiếm, danh mục tròn, lưới xem trước4sản phẩm, sidebar danh mục, bộ lọc/sắp xếp/lưới–danh sách, gallery/biến thể/số lượng ngay trong chi tiết, giỏ hàng gọn và checkout theo nhóm. Không sao chép dữ liệu/đánh giá/phí vận chuyển/phương thức thanh toán giả của demo. Chỉ thay cách hiển thị, không đổi giá và quy tắc tính tiền.
- Chỉ dành cho điện thoại: lưới2cột co theo viewport, padding nhỏ hơn dưới350px, sidebar82–110px. Bản web mặc định tối đa430px; có thể thử `http://127.0.0.1:5174/?width=320` với các giá trị320/360/390/430/480. Đây là cùng app trong iframe, không phải layout desktop hoặc bản app độc lập.
- Chuẩn hiện hành: Destiny_Violet_Full_UI_Redesign.html, 4 tab Trang chủ / Danh mục / Giỏ hàng / Tài khoản. Voucher và thông báo mở thành màn riêng. Flash Sale đỏ dưới quảng cáo là ngoại lệ màu theo yêu cầu mới; xem chi tiết lịch tự động, voucher thưởng và giới thiệu tại docs/mobile-violet-redesign.md của hệ thống.
- Ảnh thật dùng Expo Image với cache memory/disk trên native, skeleton, tải lại thủ công khi lỗi và nạp trước tối đa2ảnh gallery kế tiếp. Không đổi URL hay hợp đồng media. Hiệu ứng nhấn, chuyển trang, tab và tải ảnh tôn trọng Reduce Motion; không thêm thư viện.
- Khách chưa đăng nhập được xem catalog công khai; mua hàng yêu cầu đăng nhập. Tài khoản đăng ký mới phải nhập mã giới thiệu hợp lệ của tài khoản khác; không có email/mật khẩu hay nhánh bỏ qua giới thiệu nhúng trong bundle.
- Mua ngay dùng giỏ tạm riêng trước khi thanh toán, không gộp vào giỏ thường. Giỏ thường/Flash sale và các phạm vi voucher tách biệt; voucher không giảm số tiền bị trừ. Địa chỉ nhận hàng có một ô nhập chung, kèm tên/số điện thoại; không tách quốc gia/mã bưu điện.
- Hồ sơ, đơn hàng/ảnh sản phẩm/yêu cầu hủy chờ admin, ví/lịch sử tiền/yêu cầu giao dịch, voucher riêng hai loại/tặng/lịch sử chuyển, chat chữ/ảnh/đã xem và thông báo nối API thật. Nạp tiền mở CSKH; rút tiền giữ xác minh lại email/mật khẩu trước khi gửi yêu cầu.
- CSKH dùng Viber `+12138296490` thay Telegram. Deep link được xử lý kèm thông báo khi thiếu Viber; cần kiểm tra mở đúng cuộc trò chuyện trên điện thoại có Viber, chưa xác nhận chỉ bằng emulator.
-12ngôn ngữ giao diện: Anh, Trung, Việt, Pháp, Tây Ban Nha, Bồ Đào Nha, Khmer, Thái, Lào, Myanmar, Nga, Indonesia. Mặc định Anh, lưu lựa chọn trên thiết bị; lựa chọn Ả Rập đã lưu từ bản trước tự chuyển về tiếng Anh. Tên/mô tả sản phẩm và nội dung khách/admin nhập không tự dịch. Lỗi nghiệp vụ nguyên văn từ server vẫn giữ nguyên, không tự suy đoán bản dịch.
- Đơn đang chờ phản hồi giữ UUID/body trong SecureStore theo từng tài khoản, chia chunk Unicode an toàn; retry không sinh đơn mới. Đây không phải xác nhận thanh toán khi mạng lỗi: cần nhận kết quả server hoặc thử lại đúng intent.

## Kiểm thử
`npm run typecheck` kiểm tra TypeScript; `npm test` chạy các kiểm thử UI handler/push bằng mock native (không thay thế test thiết bị). Ở gốc hệ thống, `RUN_DB_TESTS=1 npm test` kiểm tra PostgreSQL schema riêng và hợp đồng mobile; `npm run test:api`/`npm run db:verify` kiểm tra API/dữ liệu nhập. Kết quả native/emulator và các phần chưa xác nhận nằm tại `docs/validation.md` của hệ thống.

Tài khoản test đặc biệt được chủ dự án yêu cầu được tạo riêng phía server với trạng thái active, số dư ban đầu0. Công cụ `scripts/create-mobile-test-account.ts` nhận thông tin qua biến môi trường; không ghi mật khẩu vào mã mobile, không sửa điều kiện đăng ký thông thường, không tự ghi đè hồ sơ đã tồn tại hoặc tự cấp tiền test.

## Kiểm tra phụ thuộc và iOS

RNFirebase 26 yêu cầu New Architecture (Expo 57 dùng sẵn). iOS giữ CocoaPods/static frameworks bằng plugin `disableSPM: true` và `forceStaticLinking` cho `RNFBApp`, `RNFBMessaging`; không kết hợp SPM mặc định với static frameworks. Build iOS cần macOS và Xcode tương thích Expo 57; không thể xác nhận build iOS chỉ bằng TypeScript trên Windows.

Đã áp override tối thiểu `@grpc/grpc-js >=1.13.6`. Các cảnh báo npm audit còn lại phải được rà soát theo đường dẫn thực tế; không hứa không có lỗ hổng chỉ vì `expo-doctor` đạt. Những phụ thuộc build như `braces`, `node-forge`, `xcode/uuid` không được giải quyết bằng cách hạ Expo/React Native theo gợi ý tự động.

`npm run test:push` kiểm tra logic đăng ký token, quyền thông báo, chống hiển thị trùng, callback theo phiên và dữ liệu mở thông báo bằng mock native. Đây không phải kiểm thử nhận FCM thực tế. `initializePush` chỉ khôi phục khi đã có quyền; `enablePush` chỉ được gọi từ thao tác bật thông báo của người dùng. Server phải bật FCM và cấu hình Firebase service account/APNs phù hợp trước khi kiểm thử gửi thật; không nhúng các khóa server vào mobile.

## Định danh & phát hành

- Android/iOS: `destn.dstnm.destinymain`; Apple team `827H8UVFKV`.
- Android giữ nhãn Destiny USA. iOS giữ CFBundleDisplayName Destinymain của bản cũ.
- Bản code cũ: 1.0.8+8. Cấu hình khởi điểm 1.0.9/build9; **phải kiểm tra số build mới nhất trên Play/App Store Connect và tăng cao hơn trước khi upload**.
- Android compileSDK36, targetSDK36; minSDK24 theo stack mới (khác min23 của Flutter cũ). Target mới không đồng nghĩa đã được kiểm thử mọi thiết bị.
- Khi build Android: chủ dự án chạy `npm run signing:prepare` ở thư mục hệ thống gốc để tạo local `credentials.json` trỏ keystore cũ. Không tạo key mới. Không gửi keystore cho bên chỉ phát hành iOS.
- iOS dùng bundle/team/provisioning đúng app đang phát hành; APNs key nằm trên Firebase/server, không nhúng vào source.
- Kiểm tra notification permission Android13+, edge-to-edge/insets, predictive back, system Photo Picker và native libraries16KB trước release. Xem [Android target SDK](https://developer.android.com/google/play/requirements/target-sdk), [16KB](https://developer.android.com/guide/practices/page-sizes), [Expo compatibility](https://docs.expo.dev/versions/latest/).

## Hợp đồng kết nối

Khách đăng nhập bằng `/api/auth/login` (email/password), không dùng Firebase Auth. Bearer token lưu SecureStore. Tài khoản `referral_required` chỉ được mở màn nhập mã. Các request tạo đơn/giao dịch/hủy có `Idempotency-Key` UUID giữ nguyên khi retry. Chat dùng clientId UUID và Socket.IO `/socket.io`; API chi tiết trong `api-contract.md` khi tạo gói bàn giao. Mọi tiền mới là số nguyên; voucher ghi nhận nhưng không giảm tiền thu.

Không có module admin, database hoặc Supabase SDK trong app. Ảnh upload API `/api/media`, sau đó gửi URL trả về vào chat. FCM token đăng ký `/api/devices`, tắt đăng ký trước logout và xử lý token refresh.
