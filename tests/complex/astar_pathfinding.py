# expect: [(0, 0), (1, 0), (1, 1), (1, 2), (2, 2), (3, 2), (4, 2), (4, 3), (4, 4)]
# expect: 8
class GridAStar:
    def __init__(self, width, height, walls):
        self.width = width
        self.height = height
        self.walls = {}
        i = 0
        while i < len(walls):
            self.walls[walls[i]] = True
            i = i + 1

    def heuristic(self, a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    def in_bounds(self, pos):
        x = pos[0]
        y = pos[1]
        return x >= 0 and x < self.width and y >= 0 and y < self.height

    def passable(self, pos):
        return pos not in self.walls

    def neighbors(self, pos):
        x = pos[0]
        y = pos[1]
        candidates = [(x + 1, y), (x, y + 1), (x - 1, y), (x, y - 1)]
        result = []
        i = 0
        while i < len(candidates):
            nxt = candidates[i]
            if self.in_bounds(nxt) and self.passable(nxt):
                result = result + [nxt]
            i = i + 1
        return result

    def best_index(self, open_set, goal, f_score):
        best_i = 0
        best = open_set[0]
        best_f = f_score[best]
        best_h = self.heuristic(best, goal)
        i = 1
        while i < len(open_set):
            node = open_set[i]
            node_f = f_score[node]
            node_h = self.heuristic(node, goal)
            if node_f < best_f or (node_f == best_f and node_h < best_h):
                best_i = i
                best = node
                best_f = node_f
                best_h = node_h
            i = i + 1
        return best_i

    def remove_index(self, items, index):
        result = []
        i = 0
        while i < len(items):
            if i != index:
                result = result + [items[i]]
            i = i + 1
        return result

    def reconstruct(self, came_from, current):
        path = [current]
        while current in came_from:
            current = came_from[current]
            path = [current] + path
        return path

    def find_path(self, start, goal):
        open_set = [start]
        came_from = {}
        g_score = {start: 0}
        f_score = {start: self.heuristic(start, goal)}

        while len(open_set) > 0:
            current_index = self.best_index(open_set, goal, f_score)
            current = open_set[current_index]

            if current == goal:
                return self.reconstruct(came_from, current)

            open_set = self.remove_index(open_set, current_index)
            neighbors = self.neighbors(current)
            i = 0
            while i < len(neighbors):
                neighbor = neighbors[i]
                tentative = g_score[current] + 1
                if neighbor not in g_score or tentative < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative
                    f_score[neighbor] = tentative + self.heuristic(neighbor, goal)
                    if neighbor not in open_set:
                        open_set = open_set + [neighbor]
                i = i + 1

        return []

walls = [(2, 0), (2, 1), (2, 3), (2, 4)]
solver = GridAStar(5, 5, walls)
path = solver.find_path((0, 0), (4, 4))
print(path)
print(len(path) - 1)

