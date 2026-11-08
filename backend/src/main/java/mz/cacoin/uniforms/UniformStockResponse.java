package mz.cacoin.uniforms;

import java.util.List;

public record UniformStockResponse(
    int total, List<UniformStockItemResponse> sizes, List<String> standardSizes) {}
