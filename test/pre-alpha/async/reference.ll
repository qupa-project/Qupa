%Task = type { i8*, i8*, i8, %Task* } ; hdl, contID, returnID, caller

declare void @i32_print(i32)

declare i8* @malloc(i32)
declare void @free(i8*)


define void @Dispatch (%Task %task, i8 %contID) {
	entry:
		%0 = alloca %Task
		store %Task %task, %Task* %0

		; Set the cotinuation point
		%1 = getelementptr %Task, %Task* %0, i32 0, i32 1
		%2 = load i8*, i8** %1
		store i8 %contID, i8* %2

		; Get the HDL
		%3 = getelementptr %Task, %Task* %0, i32 0, i32 0
		%hdl = load i8*, i8** %3

		; Continue execution
		call void @llvm.coro.resume(i8* %hdl)

		; Has finished?
		%4 = call i1 @llvm.coro.done(i8* %hdl)
		br i1 %4, label %cleanup, label %done

	cleanup:
		call void @llvm.coro.destroy(i8* %hdl)
		br label %done

	done:
		ret void
}


define i8* @fib (i32 %index, %Task %job) {
	setup:
		%waiting = alloca i32
		store i32 1, i32* %waiting

		%job_ptr = alloca %Task
		store %Task %job, %Task* %job_ptr

		%contID_ptr = getelementptr %Task, %Task* %job_ptr, i32 0, i32 1
		%contID = load i8*, i8** %contID_ptr
		%returnID_ptr = getelementptr %Task, %Task* %job_ptr, i32 0, i32 2
		%returnID = load i8, i8* %returnID_ptr

		%caller_ptr_ptr = getelementptr %Task, %Task* %job_ptr, i32 0, i32 3
		%caller_ptr = load %Task*, %Task** %caller_ptr_ptr
		%caller = load %Task, %Task* %caller_ptr

		; Declared state breeching variables
		%part = alloca i1
		%a = alloca i32
		%b = alloca i32

		%dispatch.1.hdl = alloca i8*
		%dispatch.1.task = alloca %Task
		%dispatch.2.hdl = alloca i8*
		%dispatch.2.task = alloca %Task

		%promise = alloca i32
		%pv = bitcast i32* %promise to i8*
		%id = call token @llvm.coro.id(i32 0, i8* %pv, i8* null, i8* null)
		%need.dyn.alloc = call i1 @llvm.coro.alloc(token %id)
		br i1 %need.dyn.alloc, label %dyn.alloc, label %coro.begin

	dyn.alloc:
		%size = call i32 @llvm.coro.size.i32()
		%alloc = call i8* @malloc(i32 %size)
		br label %coro.begin

	coro.begin:
		%phi = phi i8* [ null, %setup ], [ %alloc, %dyn.alloc ]
		%hdl = call noalias i8* @llvm.coro.begin(token %id, i8* %phi)
		br label %hang

	hang:
		%waiting_val = load i32, i32* %waiting
		%waiting_nx = sub i32 %waiting_val, 1
		%is_done = icmp sle i32 0, %waiting_nx

		%state = call token @llvm.coro.save(i8* %hdl)
		%sus = call i8 @llvm.coro.suspend(token %state, i1 %is_done)
		switch i8 %sus, label %suspend [i8 0, label %resume
																	i8 1, label %cleanup]

	resume:
		%cont_from = load i8, i8* %contID
		switch i8 %cont_from, label %hang [ i8 1, label %start
			i8 2, label %callback1
			i8 3, label %callback2
		]

	return:
		call void @Dispatch ( %Task %caller, i8 %returnID )
		br label %hang



	start:
		br label %loop

	loop:
		%ittr = phi i32 [ 1000, %start ], [ %0, %loop ]
		%0 = sub i32 %ittr, 1
		%1 = icmp uge i32 %0, 1000
		br i1 %1, label %loop, label %main

	main:
		%2 = icmp ule i32 %index, 1
		br i1 %2, label %exitConst, label %dispatch1

	exitConst:
		store i32 1, i32* %promise
		br label %return

	dispatch1:
		%call1_a1 = sub i32 %index, 1
		%call1_t = alloca %Task

		; Set the continue ID
		%3 = call i8* @malloc(i32 4)
		store i8 0, i8* %3
		%4 = getelementptr %Task, %Task* %call1_t, i32 0, i32 1
		store i8* %3, i8** %4

		; Set the returnID
		%5 = getelementptr %Task, %Task* %call1_t, i32 0, i32 2
		store i8 2, i8* %5

		; Set caller
		%6 = getelementptr %Task, %Task* %call1_t, i32 0, i32 3
		store %Task* %job_ptr, %Task** %6


		; Setup the function
		%7 = load %Task, %Task* %call1_t
		%8 = call i8* @fib (i32 %call1_a1, %Task %7)
		%9 = getelementptr %Task, %Task* %call1_t, i32 0, i32 0
		store i8* %8, i8** %9
		%10 = load %Task, %Task* %call1_t
		call void @Dispatch (%Task %10, i8 1)

		; Mark awaiting one callback
		%11 = add i32 %waiting_nx, 1
		store i32 %11, i32* %waiting

		store i8* %8, i8** %dispatch.1.hdl
		store %Task %10, %Task* %dispatch.1.task

		br label %dispatch2

	dispatch2:
		%call2_a1 = sub i32 %index, 2
		%call2_t = alloca %Task

		; Set the continue ID
		%12 = call i8* @malloc(i32 4)
		store i8 0, i8* %12
		%13 = getelementptr %Task, %Task* %call2_t, i32 0, i32 1
		store i8* %12, i8** %13

		; Set the returnID
		%14 = getelementptr %Task, %Task* %call2_t, i32 0, i32 2
		store i8 2, i8* %14

		; Set caller
		%15 = getelementptr %Task, %Task* %call2_t, i32 0, i32 3
		store %Task* %job_ptr, %Task** %15


		; Setup the function
		%16 = load %Task, %Task* %call2_t
		%17 = call i8* @fib (i32 %call2_a1, %Task %16)
		%18 = getelementptr %Task, %Task* %call2_t, i32 0, i32 0
		store i8* %17, i8** %18
		%19 = load %Task, %Task* %call2_t
		call void @Dispatch (%Task %19, i8 1)

		; Mark awaiting one callback
		%20 = add i32 %waiting_nx, 1
		store i32 %20, i32* %waiting

		store i8* %17, i8** %dispatch.1.hdl
		store %Task %19, %Task* %dispatch.1.task

		br label %hang

	callback1:
		%21 = load %Task, %Task* %dispatch.1.task
		%22 = load i8*, i8** %dispatch.1.hdl

		; Read the result
		%promise1.addr.raw = call i8* @llvm.coro.promise(i8* %22, i32 4, i1 false)
		%promise1.addr = bitcast i8* %promise1.addr.raw to i32*
		%res1 = load i32, i32* %promise1.addr ; load a value from the promise
		store i32 %res1, i32* %a

		; Clean up the function
		call void @Dispatch(%Task %21, i8 0)

		br label %join
	callback2:
		%23 = load %Task, %Task* %dispatch.1.task
		%24 = load i8*, i8** %dispatch.1.hdl

		; Read the result
		%promise2.addr.raw = call i8* @llvm.coro.promise(i8* %24, i32 4, i1 false)
		%promise2.addr = bitcast i8* %promise2.addr.raw to i32*
		%res2 = load i32, i32* %promise2.addr ; load a value from the promise
		store i32 %res2, i32* %b

		; Clean up the function
		call void @Dispatch(%Task %23, i8 0)

		br label %join

	join:
		%completed = icmp sle i32 %waiting_nx, 0
		br i1 %completed, label %join_final, label %hang

	join_final:
		%a_val = load i32, i32* %a
		%b_val = load i32, i32* %b
		%result = add i32 %a_val, %b_val
		store i32 %result, i32* %promise
		br label %return



	cleanup:
		%mem = call i8* @llvm.coro.free(token %id, i8* %hdl)
		call void @free(i8* %mem)
		br i1 %need.dyn.alloc, label %dyn.free, label %suspend

	dyn.free:
		call void @free(i8* %mem)
		br label %suspend

	suspend:
		call i1 @llvm.coro.end(i8* %hdl, i1 0)
		ret i8* %hdl
}





define i32 @main() {
entry:
	%task = alloca %Task

	; Set the continue ID
	%0 = call i8* @malloc(i32 4)
	store i8 1, i8* %0
	%1 = getelementptr %Task, %Task* %task, i32 0, i32 1
	store i8* %0, i8** %1

	%2 = getelementptr %Task, %Task* %task, i32 0, i32 3
	store %Task* null, %Task** %2

	%task_val = load %Task, %Task* %task

  %hdl = call i8* @fib(i32 4, %Task %task_val)

  %promise.addr.raw = call i8* @llvm.coro.promise(i8* %hdl, i32 4, i1 false)
  %promise.addr = bitcast i8* %promise.addr.raw to i32*
  %val0 = load i32, i32* %promise.addr
  call void @i32_print(i32 %val0)

  call void @llvm.coro.resume(i8* %hdl)
  %val1 = load i32, i32* %promise.addr
  call void @i32_print(i32 %val1)

  call void @llvm.coro.destroy(i8* %hdl)

  ret i32 0
}



declare i8* @llvm.coro.promise(i8*, i32, i1)
declare token @llvm.coro.id(i32, i8*, i8*, i8*)
declare i1 @llvm.coro.alloc(token)
declare i32 @llvm.coro.size.i32()
declare i8* @llvm.coro.begin(token, i8*)
declare i8 @llvm.coro.suspend(token, i1)
declare i8* @llvm.coro.free(token, i8*)
declare i1 @llvm.coro.end(i8*, i1)
declare i1 @llvm.coro.done(i8*)
declare token @llvm.coro.save(i8*)

declare void @llvm.coro.resume(i8*)
declare void @llvm.coro.destroy(i8*)