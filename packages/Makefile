SUBDIRS = debian redhat

export TOPDIR = $(shell pwd)
export PROJECT_DIR = $(shell readlink -f $(TOPDIR)/..)

.PHONY: all clean

all:
	for dir in $(SUBDIRS); do \
		$(MAKE) -C $$dir $@ || exit 1; \
	done

clean:
	for dir in $(SUBDIRS); do \
		$(MAKE) -C $$dir $@ || exit 1; \
	done
