#!/bin/bash

dir="."

if [ ! -z "$1" ]; then
    dir="$1"
fi

extensions=$(find $dir -maxdepth 1 -type d -not -wholename $dir -not -name . -not -name .git -not -name .extbuild -not -name .extbuilds)
failed_builds=()
extbuilds_final_dir=$(pwd)/.extbuilds

for extension in $extensions; do
    name=$(basename $extension)
    echo "PROCESS $name"

    cd $extension
    echo "PWD $(pwd)"

    if [ ! -f extension.json ]; then
        echo "No metadata found for extension: $name"
        failed_builds+=($name)
        continue
    fi

    metadata=$(cat extension.json)
    main_directory=$(echo $metadata | jq -r '.main_directory')
    build_command=$(echo $metadata | jq -r '.build_command')
    resources=$(echo $metadata | jq -r '.resources')
    version=$(cat package.json | jq -r '.version')

    npm install -D

    if [ -f "$extension/tsconfig.node.json" ] || [ -f "$extension/tsconfig.bun.json" ]; then
        if [ -z "$BUN" ] || [ "$BUN" != "1" ]; then
            echo "PREPARE $name"
            rm -f "$extension/tsconfig.json"
            ln -s "$extension/tsconfig.node.json" "$extension/tsconfig.json"
        else
            echo "Bun extension build with this script is not supported yet"
            continue
        fi
    fi

    if [ $? -eq 0 ]; then
        if [ -z "$build_command" ] || test "$build_command" = "null"; then
            echo "NOBUILD $name"
        else
            echo "BUILD $name"
            eval $build_command

            if [ $? -ne 0 ]; then
                echo "FAIL $name"
                failed_builds+=($name)
                continue
            fi
        fi
    fi

    if [ $? -ne 0 ]; then
        echo "FAIL $name"
        failed_builds+=($name)
    else
        echo "PACKAGE $name"
        root="${name}-${version}"
        extbuild_dir=".extbuild/$root"

        echo "MKDIR $extbuild_dir"
        mkdir -p $extbuild_dir/$main_directory
        echo "COPY $main_directory/* $extbuild_dir/$main_directory"
        cp -r $main_directory/* $extbuild_dir/$main_directory
        echo "COPY package.json $extbuild_dir"
        cp package.json $extbuild_dir
        echo "COPY extension.json $extbuild_dir"
        cp extension.json $extbuild_dir
        echo "COPY $resources/ $extbuild_dir"
        cp -r $resources/ $extbuild_dir

        if [ -f README.md ]; then
            echo "COPY README.md $extbuild_dir"
            cp README.md $extbuild_dir
        fi
        
        if [ -f README ]; then
            echo "COPY README $extbuild_dir"
            cp README $extbuild_dir
        fi

        if [ -f LICENSE ]; then
            echo "COPY LICENSE $extbuild_dir"
            cp LICENSE $extbuild_dir
        fi

        echo "TAR $root.tar.gz"
        cd .extbuild
        tar -czvf $root.tar.gz $root
        mv $root.tar.gz ..
        cd ..

        if [ $? -ne 0 ]; then
            echo "FAIL $name"
            failed_builds+=($name)
        else
            echo "SUCCESS $name"
            mkdir -p "$extbuilds_final_dir/$name"
            count=1

            if [ -e "$extbuilds_final_dir/$name/$root.tar.gz" ]; then
                while [ -e "$extbuilds_final_dir/$name/$root-$count.tar.gz" ]; do
                    ((count++))
                done

                prevcount=$((count - 1))

                sum1=$(tarsum "$root.tar.gz")
                sum2=$(tarsum "$extbuilds_final_dir/$name/$root-$prevcount.tar.gz")

                if [ -e "$extbuilds_final_dir/$name/$root-$prevcount.tar.gz" ] && test "$sum1" = "$sum2"; then
                    ((count--))
                fi

                sum2=$(tarsum "$extbuilds_final_dir/$name/$root.tar.gz")

                if [ $count -eq 1 ] && test "$sum1" = "$sum2"; then
                    count=""
                else
                    count="-$count"
                fi                 
            else
                count=""
            fi

            if [ ! -e "$extbuilds_final_dir/$name/$root$count.tar.gz" ]; then
                mv "$root.tar.gz" "$extbuilds_final_dir/$name/$root$count.tar.gz"
                echo "SAVE $root$count.tar.gz"
            else
                echo "SKIP $root$count.tar.gz"
                rm "$root.tar.gz"
            fi
        fi
    fi

    cd ..
done

if [ ${#failed_builds[@]} -eq 0 ]; then
    echo "All extensions built successfully"
else
    echo "Failed to build extensions: ${failed_builds[@]}"
    exit 1
fi
