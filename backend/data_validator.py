"""
Módulo de Validación Estricta de Datos de Producción.
Aplica validaciones de tipo, formato, consistencia matemática y umbrales de confianza.
NUNCA altera ni inventa valores; clasifica el estado del registro.
"""

from typing import Dict, Any, List, Tuple
from .config import MIN_OCR_CONFIDENCE_THRESHOLD
from .data_extractor import ExtractedRecord


class ValidationStatus:
    VALIDO = "VALIDO"
    PARCIAL = "PARCIAL"
    INCONSISTENTE = "INCONSISTENTE"
    REQUIERE_REVISION = "REQUIERE_REVISION"


class DataValidator:
    """Validador industrial con reglas de coherencia e idempotencia."""

    def __init__(self, min_confidence: float = MIN_OCR_CONFIDENCE_THRESHOLD):
        self.min_confidence = min_confidence

    def validate(
        self,
        record: ExtractedRecord,
        previous_record: Any = None
    ) -> Tuple[str, List[str]]:
        """
        Ejecuta todas las reglas de validación sobre el registro extraído.
        Retorna (status, lista_de_observaciones).
        """
        issues: List[str] = []
        status = ValidationStatus.VALIDO

        # 1. Validación de campos obligatorios mínimos para identificar la hora
        if not record.horario or record.horario == "NO_LEGIBLE":
            issues.append("Horario de producción no identificado o ilegible.")
            return ValidationStatus.REQUIERE_REVISION, issues

        if not record.fecha:
            issues.append("Fecha de producción no identificada.")
            return ValidationStatus.REQUIERE_REVISION, issues

        # 2. Validación de tipos y rangos de datos numéricos
        num_fields = [
            ("obj_pz_hora", record.obj_pz_hora, 0, 300),
            ("real_pz_hora", record.real_pz_hora, 0, 300),
            ("obj_acumulado", record.obj_acumulado, 0, 2000),
            ("real_acumulado", record.real_acumulado, 0, 2000),
            ("piezas_malas", record.piezas_malas, 0, 300),
            ("tiempo_minutos", record.tiempo_minutos, 0, 600)
        ]

        for field_name, val, min_val, max_val in num_fields:
            if val is not None:
                if not isinstance(val, int):
                    issues.append(f"El campo {field_name} debe ser un entero válido (valor: {val}).")
                    status = ValidationStatus.REQUIERE_REVISION
                elif val < min_val or val > max_val:
                    issues.append(f"El campo {field_name} ({val}) está fuera del rango industrial esperado [{min_val}-{max_val}].")
                    status = ValidationStatus.REQUIERE_REVISION

        # 3. Validación de coherencia matemática operacional
        # Regla: Real Acumulado de la hora = Real Acumulado anterior + (Real Pz/Hora - Piezas Malas)
        # O para la primera hora: Real Acumulado = Real Pz/Hora - Piezas Malas
        if (record.real_pz_hora is not None and
            record.piezas_malas is not None and
            record.real_acumulado is not None):

            # Caso A: Tenemos registro previo en la misma jornada/turno
            if previous_record and previous_record.real_acumulado is not None:
                expected_acum = previous_record.real_acumulado + (record.real_pz_hora - record.piezas_malas)
                if record.real_acumulado != expected_acum:
                    issues.append(
                        f"Inconsistencia de balance: Real Acumulado ({record.real_acumulado}) != "
                        f"Previo ({previous_record.real_acumulado}) + (Real {record.real_pz_hora} - Malas {record.piezas_malas}) "
                        f"= Esperado {expected_acum}."
                    )
                    status = ValidationStatus.INCONSISTENTE
            # Caso B: No hay previo o es la primera hora del turno
            else:
                piezas_ok_hora = record.real_pz_hora - record.piezas_malas
                # Si es fila inicial o cálculo directo
                if record.real_acumulado < piezas_ok_hora:
                    issues.append(
                        f"Inconsistencia: Real Acumulado ({record.real_acumulado}) no puede ser menor "
                        f"que las piezas OK de la hora ({piezas_ok_hora})."
                    )
                    status = ValidationStatus.INCONSISTENTE

        # 4. Verificación de umbral de confianza OCR
        for field, conf in record.field_confidences.items():
            if conf > 0.0 and conf < self.min_confidence:
                issues.append(f"Confianza baja ({conf:.2f} < {self.min_confidence}) en campo: '{field}'.")
                if status == ValidationStatus.VALIDO:
                    status = ValidationStatus.REQUIERE_REVISION

        # 5. Detección de campos parciales (faltan algunos campos no críticos)
        if record.real_pz_hora is None or record.real_acumulado is None:
            issues.append("Datos numéricos de producción incompletos en la última hora.")
            if status != ValidationStatus.INCONSISTENTE:
                status = ValidationStatus.PARCIAL

        if not issues:
            issues.append("Validación completada sin inconsistencias.")

        return status, issues

