#include <iostream>

extern "C" {
	int i32_add(int a, int b) {
		return a + b;
	}
	int i32_mul(int a, int b) {
		return a * b;
	}
	int i32_div(int a, int b) {
		return a / b;
	}
	int i32_rem(int a, int b) {
		return a % b;
	}

	bool i32_equal(int a, int b) {
		return a == b;
	}
	bool i32_gt(int a, int b) {
		return a > b;
	}
	bool i32_ge(int a, int b) {
		return a >= b;
	}
	bool i32_lt(int a, int b) {
		return a < b;
	}
	bool i32_le(int a, int b) {
		return a <= b;
	}

	float f32_add(float a, float b) {
		return a + b;
	}
	bool f32_equal(float a, float b) {
		return a == b;
	}

	bool i1_and(bool a, bool b) {
		return a && b;
	}
	bool i1_or(bool a, bool b) {
		return a || b;
	}
	bool i1_not(bool a, bool b) {
		return !a;
	}

	void i32_print(int val) {
		std::cout << val;
	}
	void f32_print(float val) {
		std::cout << val;
	}
	void i1_print(bool val) {
		if (val) {
			std::cout << "true";
		} else {
			std::cout << "false";
		}
	}
	void i32_println(int val) {
		std::cout << val << std::endl;
	}
	void f32_println(float val) {
		std::cout << val << std::endl;
	}
	void i1_println(bool val) {
		if (val) {
			std::cout << "true" << std::endl;
		} else {
			std::cout << "false" << std::endl;
		}
	}
}