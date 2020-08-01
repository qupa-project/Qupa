; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca [ 12 x i8 ], align 4
  store [ 12 x i8 ] c"Hello World\00", [ 12 x i8 ]* %1, align 4
  %2 = bitcast [ 12 x i8 ]* %1 to i8*
  call void @println.l4vi.k(i8* %2)
  %3 = alloca i32, align 4
  store i32 42, i32* %3, align 4
  %4 = alloca [ 4 x i8 ], align 4
  store [ 4 x i8 ] c"A: \00", [ 4 x i8 ]* %4, align 4
  %5 = bitcast [ 4 x i8 ]* %4 to i8*
  call void @print.l4vi.f(i8* %5)
  %6 = load i32, i32* %3, align 4
  call void @println.l4vi.g(i32 %6)
  %7 = alloca i32, align 4
  %8 = udiv i32 %6, 3
  %9 = alloca [ 8 x i8 ], align 4
  store [ 8 x i8 ] c"'A/3': \00", [ 8 x i8 ]* %9, align 4
  %10 = bitcast [ 8 x i8 ]* %9 to i8*
  call void @print.l4vi.f(i8* %10)
  call void @println.l4vi.g(i32 %8)
  %11 = alloca [ 4 x i8 ], align 4
  store [ 4 x i8 ] c"\22A\22\00", [ 4 x i8 ]* %11, align 4
  %12 = bitcast [ 4 x i8 ]* %11 to i8*
  call void @print.l4vi.f(i8* %12)
  ret i32 0
}