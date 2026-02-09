@echo off
echo Pushing changes to GitHub...

cd /d %~dp0
cd ..

git status
git add fastapi-backend
git commit -m "Update admin layout and dashboard"
git push

pause
