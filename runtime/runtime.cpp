#include <iostream>

extern "C" {
	int i32_add(int a, int b) {
		return a + b;
	}
	float f32_add(float a, float b) {
		return a + b;
	}

	int i32_mul(int a, int b) {
		return a * b;
	}

	bool i32_equal(int a, int b) {
		return a == b;
	}
	bool f32_equal(float a, float b) {
		return a == b;
	}

	void i32_print(int val) {
		std::cout << val;
	}
	void f32_print(float val) {
		std::cout << val;
	}
	void i1_print(bool val) {
		std::cout << val;
	}
	void i32_println(int val) {
		std::cout << val << std::endl;
	}
	void f32_println(float val) {
		std::cout << val << std::endl;
	}
	void i1_println(bool val) {
		std::cout << val << std::endl;
	}
}