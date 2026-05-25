# SKILL: Remote EC2 System Execution and Management via SSH

## 🎯 Purpose (Mục đích)
- Automate remote connection, deployment, verification, and management of system services on the EC2 server using the pre-configured `my-ec2` hostname alias.

## ⚡ Triggers (Kích hoạt khi nào?)
Claude will automatically apply this skill when the user requests:
- "Run the system on EC2" or "Start remote services on the server".
- "Deploy code to server my-ec2" or "Restart docker-compose on remote host".

## 🛠 Prerequisites & Context (Yêu cầu tiên quyết & Ngữ cảnh)
- Local SSH configuration (`~/.ssh/config`) must contain a valid host named `my-ec2` with the correct Private Key (`.pem`).
- The remote `my-ec2` server must have Docker, Docker Compose, or required project runtimes pre-installed.
- Core configuration files to read beforehand: Local `~/.ssh/config` and remote `docker-compose.yml`.

## 📝 Execution Steps (Quy trình thực hiện từng bước)
1. **Step 1**: [Verify secure SSH connection to the host] -> Command to run: `rtk ssh my-ec2 "echo 'SSH Connection Verified'"`
2. **Step 2**: [Navigate to the project directory on the remote server and pull latest code changes] -> Command to run: `rtk ssh my-ec2 "cd ~ && git pull origin main"`
3. **Step 3**: [Launch or restart the entire application stack using Docker Compose in detached mode] -> Command to run: `rtk ssh my-ec2 "cd ~ && docker-compose up -d --build"`

## ✅ Validation (Tiêu chuẩn nghiệm thu & Xác thực)
After execution, the following must be performed:
- Run command: `rtk ssh my-ec2 "docker ps --format 'table {{.Names}}	{{.Status}}	{{.Ports}}'"`
- Check if [The list of target containers displays an 'Up' status and corresponding service ports are bound successfully] appears.

## ⚠️ Troubleshooting / Edge Cases (Xử lý sự cố)
- If encountering `Permission denied (publickey)` error: Verify if the ssh-agent has loaded the private key via `ssh-add -l`, or ensure the `IdentityFile` path in `~/.ssh/config` is completely accurate.
- If encountering `Connection timed out` error: Double-check the AWS EC2 Security Groups to ensure port 22 is open to the current local machine's public IP address.


---

# SKILL: Configure Local User Git Identity for Code Pushes

## 🎯 Purpose (Mục đích)
- Ensure all commit and push actions performed by Claude Code strictly utilize the local machine user's actual identity (Username and Email). Never use Claude Code's default account to maintain an accurate contribution history on GitHub.

## ⚡ Triggers (Kích hoạt khi nào?)
Claude will automatically apply this skill when the user requests:
- "Commit current code changes and push to github".
- "Push the newly modified source code to the repository".

## 🛠 Prerequisites & Context (Yêu cầu tiên quyết & Ngữ cảnh)
- Git must be installed locally on the user's machine.
- Local GitHub authentication must be pre-configured using SSH keys or a valid Personal Access Token.
- Core configuration files to read beforehand: `.git/config` of the current working repository.

## 📝 Execution Steps (Quy trình thực hiện từng bước)
1. **Step 1**: [Read the user's existing global Git configuration from the local machine] -> Command to run: `git config --global user.name` and `git config --global user.email`
2. **Step 2**: [Override and bind those credentials to the local repository scope] -> Command to run: `git config user.name "$(git config --global user.name)" && git config user.email "$(git config --global user.email)"`
3. **Step 3**: [Stage all changes, commit, and push to the remote branch using the configured personal account] -> Command to run: `git add . && git commit -m "Refactor: Automated update via Claude Code" && git push origin main`

## ✅ Validation (Tiêu chuẩn nghiệm thu & Xác thực)
After execution, the following must be performed:
- Run command: `git log -n 1 --pretty=fuller`
- Check if [The Author and Committer fields correctly display the user's personal Name and Email (containing no 'Claude' keywords)] appears.

## ⚠️ Troubleshooting / Edge Cases (Xử lý sự cố)
- If encountering `empty ident name or email` error: This indicates the local environment lacks a global git setup. Never invent a placeholder or use Claude's name. Halt execution and prompt the user to configure their identity using: `git config user.name "Your_Name" && git config user.email "email@example.com"`.


---

# SKILL: Optimize Token Queries Using rtk Proxy for Remote SSH Bash Commands

## 🎯 Purpose (Mục đích)
- Force all remote bash command streams targeting `my-ec2` to route through the `rtk` proxy wrapper to compress text output, strip out redundant logs, optimize token utilization efficiency, and minimize API overhead costs.

## ⚡ Triggers (Kích hoạt khi nào?)
Claude will automatically apply this skill when the user requests:
- "Execute bash shell on the remote my-ec2 server".
- "Run any SSH-based command to interact with the EC2 instance".

## 🛠 Prerequisites & Context (Yêu cầu tiên quyết & Ngữ cảnh)
- The `rtk` proxy CLI utility must be installed and executable within the local system's environment variable (`PATH`).
- The SSH configuration file (`~/.ssh/config`) must properly recognize the `my-ec2` host directive.

## 📝 Execution Steps (Quy trình thực hiện từng bước)
1. **Step 1**: [Wrap any SSH interactive command syntax behind the rtk proxy prefix execution utility] -> Command to run: `rtk ssh my-ec2 "[bash_command_to_execute]"`
2. **Step 2**: [Enforce structural payload size constraints using stream filters like tail, grep, or quiet flags] -> Command to run: `rtk ssh my-ec2 "docker logs app-container --tail 30"` instead of streaming raw files.
3. **Step 3**: [Validate the responsiveness and operational health of the local rtk engine] -> Command to run: `rtk status`

## ✅ Validation (Tiêu chuẩn nghiệm thu & Xác thực)
After execution, the following must be performed:
- Run command: Inspect the command line output or verify directly via rtk operational diagnostic streams.
- Check if [The response output payload is clean, concise, strictly context-relevant, and devoid of repetitive token logs] appears.

## ⚠️ Troubleshooting / Edge Cases (Xử lý sự cố)
- If encountering `rtk: command not found` error: Verify the installation directory of rtk on the local machine. Resolve quickly by appending it to the system PATH or invoking the absolute binary path directly, e.g., `/usr/local/bin/rtk ssh my-ec2 "command"`.
- If encountering `rtk proxy connection refused` error: The local rtk service proxy daemon might be asleep or blocking local ports. Restart the local rtk background service manager before retrying the SSH pipeline.
