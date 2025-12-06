"""
Форматирование вывода валидации.
"""

from typing import List, Tuple
from .issue import Issue
from .colors import Colors


class IssueFormatter:
    """Форматирование проблем валидации для вывода"""
    
    def __init__(self, manifest_path, manifest_lines: List[str]):
        self.manifest_path = manifest_path
        self.manifest_lines = manifest_lines
    
    def get_context_lines(self, line_num: int, context_size: int = 3) -> Tuple[List[str], int]:
        """Получить контекст вокруг строки"""
        if line_num is None:
            return [], 0
        
        # line_num - это 1-based номер строки, но индексы в массиве 0-based
        line_idx = line_num - 1
        
        start = max(0, line_idx - context_size)
        end = min(len(self.manifest_lines), line_idx + context_size + 1)
        
        context = [line.rstrip('\n\r') for line in self.manifest_lines[start:end]]
        # highlight_idx - это позиция проблемной строки в контексте (0-based)
        highlight_idx = line_idx - start
        
        return context, highlight_idx
    
    def format_issue(self, issue: Issue, is_error: bool = True) -> str:
        """Форматировать проблему для вывода"""
        lines = []
        
        # Заголовок с цветом
        color = Colors.RED if is_error else Colors.YELLOW
        prefix = "ERROR" if is_error else "WARNING"
        
        # Формат: file:line:column: message
        file_path = str(self.manifest_path)
        line_info = f":{issue.line}" if issue.line else ""
        
        header = f"{color}{Colors.BOLD} {prefix}{Colors.RESET} {Colors.CYAN}{file_path}{line_info}{Colors.RESET}"
        if issue.path:
            header += f" {Colors.GRAY}({issue.path}){Colors.RESET}"
        header += f"\n    {color}{issue.message}{Colors.RESET}"
        
        lines.append(header)
        
        # Контекст кода
        if issue.line:
            ctx_lines, highlight_idx = self.get_context_lines(issue.line, context_size=3)
            if ctx_lines:
                lines.append("")
                lines.append(f"    {Colors.GRAY}{'─' * 60}{Colors.RESET}")
                
                # Вычисляем начальную строку контекста
                start_line = issue.line - highlight_idx
                
                for i, ctx_line in enumerate(ctx_lines):
                    line_num = start_line + i
                    if i == highlight_idx:
                        # Подсвечиваем проблемную строку
                        lines.append(f"    {Colors.RED}{Colors.BOLD}→{Colors.RESET}{Colors.YELLOW}{line_num:4d}{Colors.RESET} │ {Colors.RED}{ctx_line}{Colors.RESET}")
                    else:
                        lines.append(f"    {Colors.GRAY} {line_num:4d}{Colors.RESET} │ {Colors.GRAY}{ctx_line}{Colors.RESET}")
                
                lines.append(f"    {Colors.GRAY}{'─' * 60}{Colors.RESET}")
        
        return '\n'.join(lines)
    
    def print_results(self, errors: List[Issue], warnings: List[Issue]):
        """Вывести результаты валидации"""
        # Проверяем поддержку цветов (Windows может не поддерживать)
        try:
            # Пробуем включить поддержку ANSI на Windows
            import sys
            if sys.platform == 'win32':
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except:
            Colors.disable()
        
        # Выводим предупреждения
        if warnings:
            print(f"\n{Colors.BOLD}{Colors.YELLOW}Warnings:{Colors.RESET}")
            print()
            for warning in warnings:
                print(self.format_issue(warning, is_error=False))
                print()
        
        # Выводим ошибки
        if errors:
            print(f"\n{Colors.BOLD}{Colors.RED}Errors:{Colors.RESET}")
            print()
            for error in errors:
                print(self.format_issue(error, is_error=True))
                print()
        
        # Итоговая статистика
        print()
        if errors:
            print(f"{Colors.RED}{Colors.BOLD}Validation failed:{Colors.RESET} {Colors.RED}{len(errors)} error(s){Colors.RESET}, {Colors.YELLOW}{len(warnings)} warning(s){Colors.RESET}")
        elif warnings:
            print(f"{Colors.YELLOW}{Colors.BOLD}Validation passed with warnings:{Colors.RESET} {Colors.YELLOW}{len(warnings)} warning(s){Colors.RESET}")
        else:
            print(f"{Colors.GREEN}{Colors.BOLD}Validation passed:{Colors.RESET} no errors or warnings")


