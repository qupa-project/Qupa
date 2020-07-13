; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca i32, align 4
  %2 = alloca i32, align 4
  %3 = alloca i32, align 4
  %4 = alloca i1, align 4
  store i32 2, i32* %1, align 4
  store i32 3, i32* %2, align 4
  store i32 0, i32* %3, align 4
  %5 = load i32, i32* %3, align 4
  call void @println.7wzx.15(i32 %5)
  %6 = load i32, i32* %1, align 4
  call void @println.7wzx.15(i32 %6)
  %7 = load i32, i32* %2, align 4
  call void @println.7wzx.15(i32 %7)
  store i32 2, i32* %3, align 4
  %8 = load i32, i32* %3, align 4
  %9 = call i1 @equal.7wzx.s(i32 %6,i32 %8)
  store i1 %9, i1* %4, align 4
  br i1 %9, label %10, label %11

10:
  store i32 42, i32* %1, align 4
  br label %11

11:
  store i32 0, i32* %3, align 4
  %12 = load i32, i32* %3, align 4
  call void @println.7wzx.15(i32 %12)
  %13 = load i32, i32* %1, align 4
  call void @println.7wzx.15(i32 %13)
  call void @println.7wzx.15(i32 %7)
  %14 = call i1 @equal.7wzx.s(i32 %13,i32 %7)
  store i1 %14, i1* %4, align 4
  br i1 %14, label %15, label %17

15:
  %16 = call i32 @add.7wzx.m(i32 %13,i32 %7)
  store i32 %16, i32* %2, align 4
  br label %18

17:
  store i32 1, i32* %2, align 4
  br label %18

18:
  store i32 0, i32* %3, align 4
  %19 = load i32, i32* %3, align 4
  call void @println.7wzx.15(i32 %19)
  call void @println.7wzx.15(i32 %13)
  %20 = load i32, i32* %2, align 4
  call void @println.7wzx.15(i32 %20)
  ret i32 0
}