export CC = gcc
export CFLAGS = -g -Wall -Wextra
export CPPFLAGS = -DDCCORD_DEBUG_HTTP
export LIBDISCORD = /usr/local/lib/libdiscord.a
export LDLIBS = -pthread $(LIBDISCORD) -lcurl
export TARGETS = common linux windows bsd macos
export BUILD_DIR = "$(abspath build)"

all: prepare $(TARGETS)
.PHONY: $(TARGETS)

prepare: $(BUILD_DIR)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/bin

$(TARGETS):
	$(MAKE) -C $@

clean:
	for t in $(TARGETS); do \
		$(MAKE) -C $$t clean; \
		if test "$$?" != "0"; then \
			exit 1; \
		fi \
	done
	$(RM) -r $(BUILD_DIR)