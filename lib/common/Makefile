COMMON_OBJECTS = main.o events/on_ready.o
BIN = sudobot

all: $(COMMON_OBJECTS)
	$(CC) $(LDFLAGS) $(COMMON_OBJECTS) -o $(BUILD_DIR)/bin/$(BIN) $(LDLIBS) 

clean:
	$(RM) -fv *.o