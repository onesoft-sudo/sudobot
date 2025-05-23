REDHAT_DIR = $(TOPDIR)/redhat
BUILD_DIR := $(REDHAT_DIR)/build
COMMON_DIR := $(TOPDIR)/common
SYSTEMD_SERVICE := $(BUILD_DIR)/usr/lib/systemd/system/sudobot.service
VERSION := $(shell jq -r .version <"$(PROJECT_DIR)"/package.json)
RPM_DIR := $(BUILD_DIR)/rpm
PACKAGE := $(TOPDIR)/sudobot-$(VERSION)-1$(shell rpm --eval '%{?dist}').noarch.rpm
SRC_PACKAGE = $(TOPDIR)/sudobot-$(VERSION)-1$(shell rpm --eval '%{?dist}').src.rpm

.PHONY: all clean

all: $(PACKAGE) $(SRC_PACKAGE)

$(PACKAGE):
	mkdir -p "$(BUILD_DIR)"
	mkdir -p $(RPM_DIR)/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

	cp $(REDHAT_DIR)/sudobot.spec.in $(RPM_DIR)/SPECS/sudobot.spec
	sed -i "s/@VERSION@/$(VERSION)/g" $(RPM_DIR)/SPECS/sudobot.spec
	sed -i "s|@PROJECT_DIR@|$(PROJECT_DIR)|g" $(RPM_DIR)/SPECS/sudobot.spec
	sed -i "s|@TOPDIR@|$(TOPDIR)|g" $(RPM_DIR)/SPECS/sudobot.spec

	echo "" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "%post" >> $(RPM_DIR)/SPECS/sudobot.spec
	cat $(COMMON_DIR)/postinst >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "" >> $(RPM_DIR)/SPECS/sudobot.spec

	echo "" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "%preun" >> $(RPM_DIR)/SPECS/sudobot.spec
	cat $(COMMON_DIR)/prerm >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "" >> $(RPM_DIR)/SPECS/sudobot.spec

	echo "" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "%files" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "%doc /usr/share/sudobot/README.md" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "%license /usr/share/sudobot/LICENSE" >> $(RPM_DIR)/SPECS/sudobot.spec

	find "$(PROJECT_DIR)/src" -type f | sed "s|$(PROJECT_DIR)|/usr/share/sudobot|g" >> $(RPM_DIR)/SPECS/sudobot.spec
	find "$(PROJECT_DIR)/config" -type f | sed "s|$(PROJECT_DIR)|/usr/share/sudobot|g" >> $(RPM_DIR)/SPECS/sudobot.spec
	find "$(PROJECT_DIR)/drizzle" -type f | sed "s|$(PROJECT_DIR)|/usr/share/sudobot|g" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/share/sudobot/tsconfig.json" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/share/sudobot/package.json" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/lib/systemd/system/sudobot.service" >> $(RPM_DIR)/SPECS/sudobot.spec

	echo "/etc/sudobot/env" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/bin/sudobot" >> $(RPM_DIR)/SPECS/sudobot.spec

	cd "$(RPM_DIR)" && rpmbuild -ba SPECS/sudobot.spec --define "_topdir $$(pwd)"
	mv "$(RPM_DIR)/RPMS/noarch/$$(basename "$(PACKAGE)")" "$(PACKAGE)"

$(SRC_PACKAGE): $(PACKAGE)
	mv "$(RPM_DIR)/SRPMS/$$(basename "$(SRC_PACKAGE)")" "$(SRC_PACKAGE)"

clean:
	rm -rf "$(BUILD_DIR)"
	rm -f "$(PACKAGE)"
	rm -f "$(SRC_PACKAGE)"