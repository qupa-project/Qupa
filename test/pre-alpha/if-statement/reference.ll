; Function Group "main":
; removed calls for simplicity
define dso_local i32 @main() #1 {
  %1 = alloca i32, align 4
  %2 = alloca i32, align 4
  %3 = alloca i32, align 4
  %4 = alloca i1, align 1
  store i32 2, i32* %1, align 4
  store i32 3, i32* %2, align 4
  store i32 2, i32* %3, align 4
  %5 = load i32, i32* %1, align 4
  %6 = load i32, i32* %3, align 4
  %7 = call i1 @equal.fxzw.s(i32 %5,i32 %6)
  store i1 %7, i1* %4, align 1
  %8 = load i1, i1* %4, align 1
  br i1 %8, label %9, label %10

9:
  store i32 42, i32* %1, align 4
  br label %10

10:
  %11 = load i32, i32* %1, align 4
  %12 = load i32, i32* %2, align 4
  %13 = call i1 @equal.fxzw.s(i32 %11,i32 %12)
  store i1 %13, i1* %4, align 1
  %14 = load i1, i1* %4, align 1
  br i1 %14, label %15, label %17

15:
  %16 = call i32 @add.fxzw.m(i32 %11,i32 %12)
  store i32 %16, i32* %2, align 4
  br label %18

17:
  store i32 1, i32* %2, align 4
  br label %18

18:
  ret i32 0
}