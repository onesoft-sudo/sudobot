COMMON_OBJECTS = $(patsubst %.c, %.o, $(wildcard **/*.c) $(wildcard *.c) $(wildcard **/**/*.c))
BIN = sudobot

all: $(COMMON_OBJECTS)
	$(CC) $(LDFLAGS) $(COMMON_OBJECTS) -o $(BUILD_DIR)/bin/$(BIN) $(LDLIBS) 

clean:
	$(RM) -fv $(COMMON_OBJECTS)