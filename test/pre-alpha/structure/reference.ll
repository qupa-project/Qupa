; ModuleID = 'test.cpp'
source_filename = "test.cpp"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.25.28614"

; Function Attrs: argmemonly nounwind willreturn
declare void @llvm.memcpy.p0i8.p0i8.i64(i8* noalias nocapture writeonly, i8* noalias nocapture readonly, i64, i1 immarg) #3

declare dso_local i32 @i32_add(i32 %0, i32 %1) #1
declare dso_local i32 @i32_mul(i32 %0, i32 %1) #1
declare dso_local void @i32_println(i32 %0) #1


%struct.Rect = type { i32, i32 }

; Function Attrs: noinline optnone uwtable
define dso_local i32 @"Area"(i64 %0) #0 {
	; Get pointer to the structure
  %2 = alloca %struct.Rect, align 4
  %3 = bitcast %struct.Rect* %2 to i64*
  store i64 %0, i64* %3, align 4

	; Get width
  %4 = getelementptr inbounds %struct.Rect, %struct.Rect* %2, i32 0, i32 1
  %5 = load i32, i32* %4, align 4

	; Get height
  %6 = getelementptr inbounds %struct.Rect, %struct.Rect* %2, i32 0, i32 0
  %7 = load i32, i32* %6, align 4

	; Multiply
  %8 = call i32 @i32_mul(i32 %7, i32 %5)
  ret i32 %8
}

; Function Attrs: noinline optnone uwtable
define dso_local i64 @"Combine"(i64 %0, i64 %1) #0 {
  %3 = alloca %struct.Rect, align 4 ; c
  %4 = alloca %struct.Rect, align 4 ; a
  %5 = alloca %struct.Rect, align 4 ; b
	; Load a pointer
  %6 = bitcast %struct.Rect* %4 to i64*
  store i64 %0, i64* %6, align 4
	; Load b pointer
  %7 = bitcast %struct.Rect* %5 to i64*
  store i64 %1, i64* %7, align 4


	; Get b.width
  %8 = getelementptr inbounds %struct.Rect, %struct.Rect* %5, i32 0, i32 0
  %9 = load i32, i32* %8, align 4
	; Get a.width
  %10 = getelementptr inbounds %struct.Rect, %struct.Rect* %4, i32 0, i32 0
  %11 = load i32, i32* %10, align 4

	; a.width + b.width
  %12 = call i32 @i32_add(i32 %11, i32 %9)
	; get c.width = result
  %13 = getelementptr inbounds %struct.Rect, %struct.Rect* %3, i32 0, i32 0
  store i32 %12, i32* %13, align 4


	; similar above, but with height
  %14 = getelementptr inbounds %struct.Rect, %struct.Rect* %5, i32 0, i32 1
  %15 = load i32, i32* %14, align 4
  %16 = getelementptr inbounds %struct.Rect, %struct.Rect* %4, i32 0, i32 1
  %17 = load i32, i32* %16, align 4
  %18 = call i32 @i32_add(i32 %17, i32 %15)
  %19 = getelementptr inbounds %struct.Rect, %struct.Rect* %3, i32 0, i32 1
  store i32 %18, i32* %19, align 4

	; return the address of the result
  %20 = bitcast %struct.Rect* %3 to i64*
  %21 = load i64, i64* %20, align 4
  ret i64 %21
}

; Function Attrs: noinline norecurse optnone uwtable
define dso_local i32 @main() #2 {
  %1 = alloca %struct.Rect, align 4 ; define a
  %2 = alloca %struct.Rect, align 4 ; define b
  %3 = alloca i32, align 4
  %4 = alloca %struct.Rect, align 4
  %5 = alloca %struct.Rect, align 4
  %6 = alloca %struct.Rect, align 4
  %7 = alloca %struct.Rect, align 4
  %8 = alloca %struct.Rect, align 4
  %9 = alloca %struct.Rect, align 4


	; a.width = 4
  %10 = getelementptr inbounds %struct.Rect, %struct.Rect* %1, i32 0, i32 0
  store i32 4, i32* %10, align 4
	; a.height = 4
  %11 = getelementptr inbounds %struct.Rect, %struct.Rect* %1, i32 0, i32 1
  store i32 5, i32* %11, align 4
	; b.width = 6
  %12 = getelementptr inbounds %struct.Rect, %struct.Rect* %2, i32 0, i32 0
  store i32 6, i32* %12, align 4
	; b.height = 7
  %13 = getelementptr inbounds %struct.Rect, %struct.Rect* %2, i32 0, i32 1
  store i32 7, i32* %13, align 4


  %14 = bitcast %struct.Rect* %4 to i8*
  %15 = bitcast %struct.Rect* %1 to i8*
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* align 4 %14, i8* align 4 %15, i64 8, i1 false)
  %16 = bitcast %struct.Rect* %4 to i64*
  %17 = load i64, i64* %16, align 4
  %18 = call i32 @"Area"(i64 %17)
  store i32 %18, i32* %3, align 4
  call void @i32_println(i32 %18)


  %19 = bitcast %struct.Rect* %5 to i8*
  %20 = bitcast %struct.Rect* %2 to i8*
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* align 4 %19, i8* align 4 %20, i64 8, i1 false)
  %21 = bitcast %struct.Rect* %5 to i64*
  %22 = load i64, i64* %21, align 4
  %23 = call i32 @"Area"(i64 %22)
  store i32 %23, i32* %3, align 4

  %24 = load i32, i32* %3, align 4
  call void @i32_println(i32 %24)


  %25 = bitcast %struct.Rect* %8 to i8*
  %26 = bitcast %struct.Rect* %2 to i8*
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* align 4 %25, i8* align 4 %26, i64 8, i1 false)
  %27 = bitcast %struct.Rect* %9 to i8*
  %28 = bitcast %struct.Rect* %1 to i8*
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* align 4 %27, i8* align 4 %28, i64 8, i1 false)
  %29 = bitcast %struct.Rect* %9 to i64*
  %30 = load i64, i64* %29, align 4
  %31 = bitcast %struct.Rect* %8 to i64*
  %32 = load i64, i64* %31, align 4
  %33 = call i64 @"Combine"(i64 %30, i64 %32)
  %34 = bitcast %struct.Rect* %7 to i64*
  store i64 %33, i64* %34, align 4
  %35 = bitcast %struct.Rect* %6 to i8*
  %36 = bitcast %struct.Rect* %7 to i8*
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* align 4 %35, i8* align 4 %36, i64 8, i1 false)
  %37 = getelementptr inbounds %struct.Rect, %struct.Rect* %6, i32 0, i32 0
  %38 = load i32, i32* %37, align 4
  call void @i32_println(i32 %38)
  %39 = getelementptr inbounds %struct.Rect, %struct.Rect* %6, i32 0, i32 1
  %40 = load i32, i32* %39, align 4
  call void @i32_println(i32 %40)
  ret i32 0
}

attributes #0 = { noinline optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }
attributes #1 = { "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "no-infs-fp-math"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }
attributes #2 = { noinline norecurse optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }
attributes #3 = { argmemonly nounwind willreturn }

!llvm.module.flags = !{!0, !1}
!llvm.ident = !{!2}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 7, !"PIC Level", i32 2}
!2 = !{!"clang version 10.0.0 "}
