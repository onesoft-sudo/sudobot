CC = gcc
CFLAGS = -Wall -Wextra -Werror -Wpedantic
LDFLAGS = -pthread

COMMON_OBJECTS = common/main.o
BUILD_DIR = build

all: prepare common linux windows bsd macos

prepare: $(BUILD_DIR)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/bin

common: $(COMMON_OBJECTS)
	$(CC) $(LDFLAGS) $(COMMON_OBJECTS) -o $(BUILD_DIR)/bin/main

linux:
	@echo Target not implemented

macos:
	@echo Target not implemented

bsd:
	@echo Target not implemented

windows:
	@echo Target not implemented