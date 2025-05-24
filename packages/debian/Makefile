DEB_DIR = $(TOPDIR)/debian
BUILD_DIR := $(DEB_DIR)/build
COMMON_DIR := $(TOPDIR)/common
SYSTEMD_SERVICE := $(BUILD_DIR)/usr/lib/systemd/system/sudobot.service
VERSION := $(shell jq -r .version <"$(PROJECT_DIR)"/package.json)
PACKAGE := $(TOPDIR)/sudobot_$(VERSION)-1_all.deb
PACKAGE_NODEP := $(TOPDIR)/sudobot-nodeps_$(VERSION)-1_all.deb

.PHONY: all clean

all: $(PACKAGE) $(PACKAGE_NODEP)

$(PACKAGE):
	mkdir -p "$(BUILD_DIR)"
	mkdir -p "$(BUILD_DIR)/usr/share/sudobot"
	mkdir -p "$(BUILD_DIR)/usr/lib/systemd/system"

	cp -r "$(DEB_DIR)/DEBIAN" "$(BUILD_DIR)"
	cp "$(COMMON_DIR)/postinst" "$(BUILD_DIR)/DEBIAN"
	cp "$(COMMON_DIR)/prerm" "$(BUILD_DIR)/DEBIAN"

	chmod 755 "$(BUILD_DIR)/DEBIAN/postinst"
	chmod 755 "$(BUILD_DIR)/DEBIAN/prerm"
	
	cp -r "$(COMMON_DIR)/bin" "$(BUILD_DIR)/usr"
	chmod 755 "$(BUILD_DIR)/usr/bin/sudobot"

	cp -r "$(COMMON_DIR)/etc" "$(BUILD_DIR)"
	chmod 600 "$(BUILD_DIR)/etc/sudobot/env"

	cp -r "$(PROJECT_DIR)/build/out" "$(BUILD_DIR)/usr/share/sudobot/js"
	cp -r "$(PROJECT_DIR)/config" "$(BUILD_DIR)/usr/share/sudobot"
	cp -r "$(PROJECT_DIR)/drizzle" "$(BUILD_DIR)/usr/share/sudobot"
	cp -r "$(PROJECT_DIR)/tsconfig.json" "$(BUILD_DIR)/usr/share/sudobot"
	cp -r "$(PROJECT_DIR)/package.json" "$(BUILD_DIR)/usr/share/sudobot"
	cp -r "$(PROJECT_DIR)/README.md" "$(BUILD_DIR)/usr/share/sudobot"
	cp -r "$(PROJECT_DIR)/blazew" "$(BUILD_DIR)/usr/share/sudobot"
	cp -r "$(PROJECT_DIR)/LICENSE" "$(SYSTEMD_SERVICE)"

	chmod 755 "$(BUILD_DIR)/usr/share/sudobot"

	cp "$(COMMON_DIR)/systemd-sudobot.service" "$(SYSTEMD_SERVICE)"
	chmod 644 "$(SYSTEMD_SERVICE)"

	cp "$(BUILD_DIR)/DEBIAN/control.in" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@VERSION@/$(VERSION)/g" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@NAME@/sudobot/g" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@CONFLICTS@/sudobot-nodeps/g" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@DEPENDENCIES@/\nDepends: nodejs \(>= 22.0.0\), npm/g" "$(BUILD_DIR)/DEBIAN/control"
	size="$$(du -s "$(BUILD_DIR)" | awk '{print $$1}')" ; sed -i "s/@SIZE@/$$size/g" "$(BUILD_DIR)/DEBIAN/control"

	dpkg-deb --build --root-owner-group "$(BUILD_DIR)" "$(PACKAGE)"

$(PACKAGE_NODEP): $(PACKAGE)
	mv "$(BUILD_DIR)/DEBIAN/control.in" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@NAME@/sudobot-nodeps/g" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@CONFLICTS@/sudobot/g" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@VERSION@/$(VERSION)/g" "$(BUILD_DIR)/DEBIAN/control"
	sed -i "s/@DEPENDENCIES@//g" "$(BUILD_DIR)/DEBIAN/control"
	size="$$(du -s "$(BUILD_DIR)" | awk '{print $$1}')" ; sed -i "s/@SIZE@/$$size/g" "$(BUILD_DIR)/DEBIAN/control"

	dpkg-deb --build --root-owner-group "$(BUILD_DIR)" "$(PACKAGE_NODEP)"

clean:
	rm -rf "$(BUILD_DIR)"
	rm -f "$(PACKAGE)"
	rm -f "$(PACKAGE_NODEP)"