#include <iostream>

extern "C" {
	int iadd(int a, int b) {
		return a + b;
	}
	float fadd(float a, float b) {
		return a + b;
	}

	void iprint(int val) {
		std::cout << val;
	}
	void fprint(float val) {
		std::cout << val;
	}
	void iprintln(int val) {
		std::cout << val << std::endl;
	}
	void fprintln(float val) {
		std::cout << val << std::endl;
	}
}