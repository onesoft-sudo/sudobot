REDHAT_DIR = $(TOPDIR)/redhat
BUILD_DIR := $(REDHAT_DIR)/build
COMMON_DIR := $(TOPDIR)/common
SYSTEMD_SERVICE := $(BUILD_DIR)/usr/lib/systemd/system/sudobot.service
VERSION := $(shell jq -r .version <"$(PROJECT_DIR)"/package.json)
RPM_DIR := $(BUILD_DIR)/rpm
PACKAGE := $(TOPDIR)/sudobot-$(VERSION)-1$(shell rpm --eval '%{?dist}').noarch.rpm
SRC_PACKAGE = $(TOPDIR)/sudobot-$(VERSION)-1$(shell rpm --eval '%{?dist}').src.rpm
PACKAGE_NODEPS = $(TOPDIR)/sudobot-nodeps-$(VERSION)-1$(shell rpm --eval '%{?dist}').noarch.rpm

.PHONY: all clean

all: $(PACKAGE) $(SRC_PACKAGE) $(PACKAGE_NODEPS)

$(PACKAGE):
	mkdir -p "$(BUILD_DIR)"

	for d in BUILD RPMS SOURCES SPECS SRPMS; do \
		mkdir -p "$(RPM_DIR)/$$d"; \
	done

	cp $(REDHAT_DIR)/sudobot.spec.in $(RPM_DIR)/SPECS/sudobot.spec
	sed -i "s|@VERSION@|$(VERSION)|g" $(RPM_DIR)/SPECS/sudobot.spec
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

	find "$(PROJECT_DIR)/build" -type f | sed "s|$(PROJECT_DIR)|/usr/share/sudobot|g" >> $(RPM_DIR)/SPECS/sudobot.spec
	find "$(PROJECT_DIR)/config" -type f | sed "s|$(PROJECT_DIR)|/usr/share/sudobot|g" >> $(RPM_DIR)/SPECS/sudobot.spec
	find "$(PROJECT_DIR)/drizzle" -type f | sed "s|$(PROJECT_DIR)|/usr/share/sudobot|g" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/share/sudobot/tsconfig.json" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/share/sudobot/package.json" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/lib/systemd/system/sudobot.service" >> $(RPM_DIR)/SPECS/sudobot.spec

	echo "/etc/sudobot/env" >> $(RPM_DIR)/SPECS/sudobot.spec
	echo "/usr/bin/sudobot" >> $(RPM_DIR)/SPECS/sudobot.spec

	cp "$(RPM_DIR)/SPECS/sudobot.spec" "$(RPM_DIR)/SPECS/sudobot-nodeps.spec"

	sed -i "s|@DEPENDENCIES@|Requires:    nodejs >= 22.0.0, nodejs-npm >= 8.0.0|g" $(RPM_DIR)/SPECS/sudobot.spec
	sed -i "s|@DEPENDENCIES@||g" $(RPM_DIR)/SPECS/sudobot-nodeps.spec

	sed -i "s|@CONFLICTS@|sudobot-nodeps|g" $(RPM_DIR)/SPECS/sudobot.spec
	sed -i "s|@CONFLICTS@|sudobot|g" $(RPM_DIR)/SPECS/sudobot-nodeps.spec

	cd "$(RPM_DIR)" && \
		rpmbuild -ba SPECS/sudobot.spec \
			--define "_topdir $$(pwd)" \
			--define "_name sudobot" && \
		rpmbuild -ba SPECS/sudobot-nodeps.spec \
			--define "_topdir $$(pwd)" \
			--define "_name sudobot-nodeps"
	
	mv "$(RPM_DIR)/RPMS/noarch/$$(basename "$(PACKAGE)")" "$(PACKAGE)"

$(SRC_PACKAGE): $(PACKAGE)
	mv "$(RPM_DIR)/SRPMS/$$(basename "$(SRC_PACKAGE)")" "$(SRC_PACKAGE)"

$(PACKAGE_NODEPS): $(PACKAGE)
	mv "$(RPM_DIR)/RPMS/noarch/$$(basename "$(PACKAGE_NODEPS)")" "$(PACKAGE_NODEPS)"

clean:
	rm -rf "$(BUILD_DIR)"
	rm -f "$(PACKAGE)"
	rm -f "$(SRC_PACKAGE)"
	rm -f "$(PACKAGE_NODEPS)"