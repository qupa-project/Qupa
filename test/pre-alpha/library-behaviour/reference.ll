; ModuleID = 'test\pre-alpha\library-behaviour\main.qp'
; Imported under *:
;   test\pre-alpha\library-behaviour\export.qp
;   test\pre-alpha\library-behaviour\export.qp

; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca i32, align 4
  %2 = alloca i32, align 4
  %3 = alloca i32, align 4
  store i32 1, i32* %1, align 4
  store i32 2, i32* %2, align 4
  %4 = load i32, i32* %1, align 4
  call void @"println@czvr.b"(i32 %4)
  %5 = load i32, i32* %2, align 4
  call void @"println@czvr.b"(i32 %5)
  %6 = call i32 @"add@czvr.7"(i32 %4,i32 %5)
  call void @"println@czvr.b"(i32 %6)
  ret i32 1
}



; ModuleID = 'test\pre-alpha\library-behaviour\export.qp'
; Assume Typedef: i32, 4
; Assume Typedef: float, 4
; Assume Typedef: double, 4
; Assume Typedef: void, 0

; Function Group "iadd":
declare dso_local i32 @"iadd"(i32 %0, i32 %1) #1

; Function Group "fadd":
declare dso_local float @"fadd"(float %0, float %1) #1

; Function Group "iprint":
declare dso_local void @"iprint"(i32 %0) #1

; Function Group "fprint":
declare dso_local void @"fprint"(float %0) #1

; Function Group "iprintln":
declare dso_local void @"iprintln"(i32 %0) #1

; Function Group "fprintln":
declare dso_local void @"fprintln"(float %0) #1


; Function Group "add":
define dso_local i32 @"add@czvr.7"(i32 %0, i32 %1) #1 {
  %3 = alloca i32, align 4
  %4 = call i32 @"iadd"(i32 %0,i32 %1)
  ret i32 %4
}
define dso_local float @"add@czvr.8"(float %0, float %1) #1 {
  %3 = alloca float, align 4
  %4 = call float @"fadd"(float %0,float %1)
  ret float %4
}

; Function Group "print":
define dso_local void @"print@czvr.9"(i32 %0) #1 {
  call void @"iprint"(i32 %0)
  ret void
}
define dso_local void @"print@czvr.a"(float %0) #1 {
  call void @"fprint"(float %0)
  ret void
}

; Function Group "println":
define dso_local void @"println@czvr.b"(i32 %0) #1 {
  call void @"iprintln"(i32 %0)
  ret void
}
define dso_local void @"println@czvr.c"(float %0) #1 {
  call void @"fprintln"(float %0)
  ret void
}






attributes #0 = { noinline nounwind optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }