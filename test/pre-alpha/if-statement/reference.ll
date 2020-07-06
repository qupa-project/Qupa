; ModuleID = 'test\pre-alpha\if-statement\main.qp'
; Imported under *:
;   test\pre-alpha\std.qp

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
  call void @"println@6be5.g"(i32 %5)
  %6 = load i32, i32* %1, align 4
  call void @"println@6be5.g"(i32 %6)
  %7 = load i32, i32* %2, align 4
  call void @"println@6be5.g"(i32 %7)
  store i32 2, i32* %3, align 4
  %8 = load i32, i32* %3, align 4
  %9 = call i1 @"equal@6be5.j"(i32 %6,i32 %8)
  store i1 %9, i1* %4, align 4
  %10 = load i1, i1* %4, align 4
  br i1 %10, label %11, label %12

11:
  store i32 42, i32* %1, align 4
  br label %12

12:
  store i32 0, i32* %3, align 4
  %13 = load i32, i32* %3, align 4
  call void @"println@6be5.g"(i32 %13)
  %14 = load i32, i32* %1, align 4
  call void @"println@6be5.g"(i32 %14)
  call void @"println@6be5.g"(i32 %7)
  %15 = call i1 @"equal@6be5.j"(i32 %14,i32 %7)
  store i1 %15, i1* %4, align 4
  %16 = load i1, i1* %4, align 4
  br i1 %16, label %17, label %19

17:
  %18 = call i32 @"add@6be5.b"(i32 %14,i32 %7)
  store i32 %18, i32* %2, align 4
  br label %20

19:
  store i32 1, i32* %2, align 4
  br label %20

20:
  store i32 0, i32* %3, align 4
  %21 = load i32, i32* %3, align 4
  call void @"println@6be5.g"(i32 %21)
  call void @"println@6be5.g"(i32 %14)
  %22 = load i32, i32* %2, align 4
  call void @"println@6be5.g"(i32 %22)
  ret i32 0
}



; ModuleID = 'test\pre-alpha\std.qp'
; Assume Typedef: i32, 4
; Assume Typedef: float, 4
; Assume Typedef: double, 4
; Assume Typedef: void, 0
; Assume Typedef: i1, 4

; Function Group "i32_add":
declare dso_local i32 @"i32_add"(i32 %0, i32 %1) #1

; Function Group "f32_add":
declare dso_local float @"f32_add"(float %0, float %1) #1

; Function Group "i1_print":
declare dso_local void @"i1_print"(i1 %0) #1

; Function Group "i32_print":
declare dso_local void @"i32_print"(i32 %0) #1

; Function Group "f32_print":
declare dso_local void @"f32_print"(float %0) #1

; Function Group "i1_println":
declare dso_local void @"i1_println"(i1 %0) #1

; Function Group "i32_println":
declare dso_local void @"i32_println"(i32 %0) #1

; Function Group "f32_println":
declare dso_local void @"f32_println"(float %0) #1

; Function Group "i32_equal":
declare dso_local i1 @"i32_equal"(i32 %0, i32 %1) #1

; Function Group "f32_equal":
declare dso_local i1 @"f32_equal"(float %0, float %1) #1



; Function Group "add":
define dso_local i32 @"add@6be5.b"(i32 %0, i32 %1) #1 {
  %3 = alloca i32, align 4
  %4 = call i32 @"i32_add"(i32 %0,i32 %1)
  store i32 %4, i32* %3, align 4
  %5 = load i32, i32* %3, align 4
  ret i32 %5
}
define dso_local float @"add@6be5.c"(float %0, float %1) #1 {
  %3 = alloca float, align 4
  %4 = call float @"f32_add"(float %0,float %1)
  store float %4, float* %3, align 4
  %5 = load float, float* %3, align 4
  ret float %5
}

; Function Group "print":
define dso_local void @"print@6be5.d"(i32 %0) #1 {
  call void @"i32_print"(i32 %0)
  ret void
}
define dso_local void @"print@6be5.e"(float %0) #1 {
  call void @"f32_print"(float %0)
  ret void
}
define dso_local void @"print@6be5.f"(i1 %0) #1 {
  call void @"i1_print"(i1 %0)
  ret void
}

; Function Group "println":
define dso_local void @"println@6be5.g"(i32 %0) #1 {
  call void @"i32_println"(i32 %0)
  ret void
}
define dso_local void @"println@6be5.h"(float %0) #1 {
  call void @"f32_println"(float %0)
  ret void
}
define dso_local void @"println@6be5.i"(i1 %0) #1 {
  call void @"i1_println"(i1 %0)
  ret void
}

; Function Group "equal":
define dso_local i1 @"equal@6be5.j"(i32 %0, i32 %1) #1 {
  %3 = alloca i1, align 4
  %4 = call i1 @"i32_equal"(i32 %0,i32 %1)
  store i1 %4, i1* %3, align 4
  %5 = load i1, i1* %3, align 4
  ret i1 %5
}
define dso_local i1 @"equal@6be5.k"(float %0, float %1) #1 {
  %3 = alloca i1, align 4
  %4 = call i1 @"f32_equal"(float %0,float %1)
  store i1 %4, i1* %3, align 4
  %5 = load i1, i1* %3, align 4
  ret i1 %5
}






attributes #0 = { noinline nounwind optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }