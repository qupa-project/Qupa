declare dso_local i1 @i32_gt(i32 %0, i32 %1)
declare dso_local i32 @i32_sub(i32 %0, i32 %1)
declare dso_local void @i32_println(i32 %0)

; Function Attrs: noinline norecurse optnone uwtable
define dso_local i32 @main() #0 {
  %1 = alloca i32, align 4
  %2 = alloca i1, align 1
  store i32 20, i32* %1, align 4
  store i1 1, i1* %2, align 1

	%3 = load i1, i1* %2, align 1
  br label %4
4:                                                ; preds = %6, %0
  %5 = load i1, i1* %2, align 1
  br i1 %5, label %6, label %10

6:                                                ; preds = %4
  %7 = load i32, i32* %1, align 4
  call void @i32_println(i32 %7)
  %8 = call i32 @i32_sub(i32 %7, i32 1)
  store i32 %8, i32* %1, align 4

  %9 = call i1 @i32_gt(i32 %8, i32 0)
  store i1 %9, i1* %2, align 1
  br label %4

10:                                               ; preds = %4
  call void @i32_println(i32 %8)

  ret i32 0
}