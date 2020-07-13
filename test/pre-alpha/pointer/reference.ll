; ModuleID = 'test\pre-alpha\pointer\main.qp'
; Imported under *:
;   test\pre-alpha\std.qp

; Function Group "createInt":
declare dso_local i32* @createInt() #1

; Function Group "add":
define dso_local void @add.fh8.1(i32* %0, i32 %1) #1 {
  %3 = alloca i32*, align 4
  store i32* %0, i32** %3, align 4
  %4 = alloca i32, align 4
  store i32 %1, i32* %4, align 4
  %5 = load i32, i32* %0, align 4
  %6 = call i32 @i32_add(i32 %5,i32 %1)
  store i32 %6, i32* %0, align 4
  ret void
}

; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca i32, align 4
  store i32 20, i32* %1, align 4
  %2 = alloca i32*, align 4
  %3 = call i32* @createInt()
  store i32* %3, i32** %2, align 4
  store i32 2, i32* %3, align 4
  %4 = load i32, i32* %1, align 4
  call void @i32_println(i32 %4)
  %5 = load i32, i32* %3, align 4
  call void @i32_println(i32 %5)
  call void @add.fh8.1(i32* %3,i32 %4)
  call void @i32_println(i32 %4)
  %6 = load i32, i32* %3, align 4
  call void @i32_println(i32 %6)
  ret i32 0
}