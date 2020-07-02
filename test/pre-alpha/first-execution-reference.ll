; ModuleID = 'test.cpp'
source_filename = "test.cpp"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.25.28614"

; Function Attrs: noinline optnone uwtable
define dso_local i32 @"?startup@@YAHXZ"() #0 {
  %1 = alloca i32, align 4
  %2 = alloca i32, align 4
  %3 = alloca i32, align 4

  store i32 1, i32* %1, align 4
  store i32 2, i32* %2, align 4

  %4 = load i32, i32* %1, align 4
  call void @iprint(i32 %4)

  %5 = load i32, i32* %2, align 4
  call void @iprint(i32 %5)

  %6 = load i32, i32* %2, align 4
  %7 = load i32, i32* %1, align 4
  %8 = call i32 @iadd(i32 %7, i32 %6)
  store i32 %8, i32* %3, align 4
  
  %9 = load i32, i32* %3, align 4
  call void @iprint(i32 %9)
  ret i32 1
}

declare dso_local void @iprint(i32) #1

declare dso_local i32 @iadd(i32, i32) #1

attributes #0 = { noinline optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }
attributes #1 = { "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "no-infs-fp-math"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }

!llvm.module.flags = !{!0, !1}
!llvm.ident = !{!2}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 7, !"PIC Level", i32 2}
!2 = !{!"clang version 10.0.0 "}
