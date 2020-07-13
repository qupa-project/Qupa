; ModuleID = 'test\pre-alpha\structure\main.qp'
; Imported under *:
;   test\pre-alpha\std.qp
%struct.Rect.cjbf = type { i32, i32 }

; Function Group "main":
define dso_local i32 @main() #1 {
  %1 = alloca %struct.Rect.cjbf, align 8
  %2 = alloca %struct.Rect.cjbf, align 8
  %3 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %1, i32 0, i32 0
  store i32 4, i32* %3, align 4
  %4 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %1, i32 0, i32 1
  store i32 5, i32* %4, align 4
  %5 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %2, i32 0, i32 0
  store i32 6, i32* %5, align 4
  %6 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %2, i32 0, i32 1
  store i32 7, i32* %6, align 4
  %7 = alloca i32, align 4
  %8 = load %struct.Rect.cjbf, %struct.Rect.cjbf* %1, align 8
  %9 = call i32 @Area.cjbf.1(%struct.Rect.cjbf %8)
  store i32 %9, i32* %7, align 4
  call void @println.cjbg.17(i32 %9)
  %10 = load %struct.Rect.cjbf, %struct.Rect.cjbf* %2, align 8
  %11 = call i32 @Area.cjbf.1(%struct.Rect.cjbf %10)
  store i32 %11, i32* %7, align 4
  call void @println.cjbg.17(i32 %11)
  %12 = alloca %struct.Rect.cjbf, align 8
  %13 = call %struct.Rect.cjbf @Combine.cjbf.2(%struct.Rect.cjbf %8,%struct.Rect.cjbf %10)
  store %struct.Rect.cjbf %13, %struct.Rect.cjbf* %12, align 8
  %14 = load i32, i32* %3, align 4
  call void @println.cjbg.17(i32 %14)
  %15 = load i32, i32* %4, align 4
  call void @println.cjbg.17(i32 %15)
  %16 = load i32, i32* %5, align 4
  call void @println.cjbg.17(i32 %16)
  %17 = load i32, i32* %6, align 4
  call void @println.cjbg.17(i32 %17)
  %18 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %12, i32 0, i32 0
  %19 = load i32, i32* %18, align 4
  call void @println.cjbg.17(i32 %19)
  %20 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %12, i32 0, i32 1
  %21 = load i32, i32* %20, align 4
  call void @println.cjbg.17(i32 %21)
  ret i32 0
}

; Function Group "Area":
define dso_local i32 @Area.cjbf.1(%struct.Rect.cjbf %0) #1 {
  %2 = alloca %struct.Rect.cjbf, align 8
  store %struct.Rect.cjbf %0, %struct.Rect.cjbf* %2, align 8
  %3 = alloca i32, align 4
  %4 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %2, i32 0, i32 0
  %5 = load i32, i32* %4, align 4
  %6 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %2, i32 0, i32 1
  %7 = load i32, i32* %6, align 4
  %8 = call i32 @mul.cjbg.r(i32 %5,i32 %7)
  store i32 %8, i32* %3, align 4
  ret i32 %8
}

; Function Group "Combine":
define dso_local %struct.Rect.cjbf @Combine.cjbf.2(%struct.Rect.cjbf %0, %struct.Rect.cjbf %1) #1 {
  %3 = alloca %struct.Rect.cjbf, align 8
  store %struct.Rect.cjbf %0, %struct.Rect.cjbf* %3, align 8
  %4 = alloca %struct.Rect.cjbf, align 8
  store %struct.Rect.cjbf %1, %struct.Rect.cjbf* %4, align 8
  %5 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %3, i32 0, i32 0
  %6 = load i32, i32* %5, align 4
  %7 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %4, i32 0, i32 0
  %8 = load i32, i32* %7, align 4
  %9 = call i32 @add.cjbg.o(i32 %6,i32 %8)
  store i32 %9, i32* %5, align 4
  %10 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %3, i32 0, i32 1
  %11 = load i32, i32* %10, align 4
  %12 = getelementptr inbounds %struct.Rect.cjbf, %struct.Rect.cjbf* %4, i32 0, i32 1
  %13 = load i32, i32* %12, align 4
  %14 = call i32 @add.cjbg.o(i32 %11,i32 %13)
  store i32 %14, i32* %10, align 4
  %15 = load %struct.Rect.cjbf, %struct.Rect.cjbf* %3, align 8
  ret %struct.Rect.cjbf %15
}