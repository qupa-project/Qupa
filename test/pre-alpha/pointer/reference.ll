; ModuleID = 'test\pre-alpha\pointer\main.qp'
; Imported under *:
;   test\pre-alpha\std.qp

; Function Group "Add":
define dso_local void @Add.4dq3.0(i32* %0, i32 %1) #1 {
  %3 = alloca i32*, align 4
  %4 = alloca i32, align 4
  %5 = load i32, i32* %0, align 4
  %6 = add i32 %5, %1
  store i32 %6, i32* %0, align 4
  ret void
}

; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca i32, align 4
  store i32 20, i32* %1, align 4
  %2 = alloca i8*, align 4
  %3 = call i8* @malloc(i32 1)
  %4 = alloca i32*, align 4
  %5 = bitcast i8* %3 to i32*
  store i32 2, i32* %5, align 4
  %6 = load i32, i32* %1, align 4
  call void @i32_println(i32 %6)
  %7 = load i32, i32* %5, align 4
  call void @i32_println(i32 %7)
  call void @Add.4dq3.0(i32* %5,i32 %6)
  call void @i32_println(i32 %6)
  %8 = load i32, i32* %5, align 4
  call void @i32_println(i32 %8)
  ret i32 0
}