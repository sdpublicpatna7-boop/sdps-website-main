#include <stdlib.h>
#include <unistd.h>
#include <libgen.h>
#include <string.h>
#include <stdio.h>
#include <mach-o/dyld.h>

int main() {
    char path[1024];
    uint32_t size = sizeof(path);
    if (_NSGetExecutablePath(path, &size) == 0) {
        char *dir = dirname(path); // Contents/MacOS
        char indexPath[2048];
        snprintf(indexPath, sizeof(indexPath), "file://%s/../../index.html", dir);

        char cmd[4096];
        if (access("/Applications/Google Chrome.app", F_OK) == 0) {
            snprintf(cmd, sizeof(cmd), "open -na \"Google Chrome\" --args --app=\"%s\" --window-size=420,720", indexPath);
        } else {
            snprintf(cmd, sizeof(cmd), "open -a Safari \"%s\"", indexPath);
        }
        system(cmd);
    }
    return 0;
}
