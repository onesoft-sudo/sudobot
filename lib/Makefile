export CC = gcc
export CFLAGS = -O2 -fPIC -g -Wall -Wextra
export CPPFLAGS = -DDCCORD_DEBUG_HTTP 

ifeq ($(NDEBUG), 1)
export CPPFLAGS += -DNDEBUG
endif

export LIBDISCORD = /usr/local/lib/libdiscord.a
export BIN_LDLIBS = -pthread $(LIBDISCORD) -lcurl -lm
export LIB_LDLIBS = -pthread -ldiscord -lcurl -lm
export TARGETS = common linux windows bsd macos
export BUILD_DIR = "$(abspath build)"
export COMMON_OBJECTS = $(patsubst %.c,%.o,$(wildcard common/**/*.c) $(wildcard common/*.c) $(wildcard common/**/**/*.c))
export ALL_OBJECTS = $(COMMON_OBJECTS)
export MAIN_OBJECT = common/main.c
export ALL_OBJECTS_WITHOUT_MAIN = $(filter-out $(MAIN_OBJECT),$(ALL_OBJECTS))
export BIN = sudobot
export LIB = libsudobot.so

all: bin
	@if test "$(BUILD_LIB)" != ""; then \
		$(MAKE) lib; \
	fi

.PHONY: $(TARGETS)

prepare: $(BUILD_DIR)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/bin
	mkdir -p $(BUILD_DIR)/lib

bin: prepare $(TARGETS)
	$(CC) $(LDFLAGS) $(ALL_OBJECTS) -o $(BUILD_DIR)/bin/$(BIN) $(BIN_LDLIBS)

lib: prepare $(TARGETS)
	$(CC) -shared $(LDFLAGS) $(ALL_OBJECTS_WITHOUT_MAIN) -o $(BUILD_DIR)/lib/$(LIB) $(LIB_LDLIBS)

$(TARGETS):
	dir="$$(readlink -f .)"; \
	echo $(MAKE) -C $@ "TOP_SRCDIR=\"$${dir}\""; \
	$(MAKE) -C $@ "TOP_SRCDIR=$${dir}"

clean:
	for t in $(TARGETS); do \
		dir="$$(readlink -f .)"; \
		$(MAKE) -C "$$t" clean "TOP_SRCDIR=$$dir"; \
		if test "$$?" != "0"; then \
			exit 1; \
		fi \
	done
	$(RM) -r $(BUILD_DIR)
