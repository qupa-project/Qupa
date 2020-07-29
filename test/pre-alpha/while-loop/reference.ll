; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca i32, align 4
  store i32 20, i32* %1, align 4
  br label %2

2:
  %3 = load i32, i32* %1, align 4
  %4 = icmp ugt i32 %3, 0
  br i1 %4, label %5, label %8

5:
  %6 = load i32, i32* %1, align 4
  call void @println.3dc6.d(i32 %6)
  %7 = sub i32 %6, 1
  store i32 %7, i32* %1, align 4
  br label %2

8:
  call void @println.3dc6.d(i32 %7)
  ret i32 0
}